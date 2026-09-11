import { AGENT_CONTRACT, contractVersionForRun } from "./contract.ts";
import { getPrompt } from "./prompts.ts";
import { executeCatalogSql, inspectCatalogSchema, type QueryExecutor } from "./sql-policy.ts";
import { finalizeRecommendation } from "./validation.ts";
import type { CatalogProduct, ComparisonResult, GroceryItem, PromptVersion, Retailer, ShopperPreferences, ToolCallSpan, TraceSummary } from "./types.ts";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

type ModelReply = {
  message: { content?: string | null; tool_calls?: ChatMessage["tool_calls"] };
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string | null;
};

export type ModelClient = {
  complete: (input: { model: string; messages: ChatMessage[]; tools: typeof TOOLS; maxCompletionTokens: number; signal: AbortSignal }) => Promise<ModelReply>;
};

export type ProductResolver = (retailer: Retailer, sourceRowId: string) => Promise<CatalogProduct | null>;

export type AgentRunInput = {
  items: GroceryItem[];
  shopperPreferences?: ShopperPreferences;
  promptVersion?: PromptVersion;
  modelName?: string;
  deploymentEnvironment?: string;
  datasetVersionCostco?: string;
  datasetVersionWalmart?: string;
  resultLimit?: number;
  evidenceThreshold?: "strong" | "weak";
  /** Set only for a preserved historical experiment; normal hosted runs use contract 0.2.1. */
  experimentName?: string;
};

export type AgentDependencies = {
  model: ModelClient;
  executeSql: QueryExecutor;
  resolveProduct: ProductResolver;
  newRunId?: () => string;
  now?: () => number;
};

const [SCHEMA_TOOL_NAME, SQL_TOOL_NAME] = AGENT_CONTRACT.tools;

export const TOOLS = [
  {
    type: "function",
    function: {
      name: SCHEMA_TOOL_NAME,
      description: "Inspect the SQLite catalog schema before writing SQL. This does not query product rows.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: SQL_TOOL_NAME,
      description: "Execute model-authored, read-only SQLite through the policy gateway. Query errors, empty results, and truncation are returned to the model.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["item_id", "sql", "purpose"],
        properties: {
          item_id: { type: "string" },
          sql: { type: "string", minLength: 1, maxLength: 4000 },
          purpose: { type: "string", minLength: 1, maxLength: 240 },
        },
      },
    },
  },
] as const;

function parseArguments(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("tool arguments must be an object");
  return parsed as Record<string, unknown>;
}

function referencedRetailers(sql: string): Retailer[] {
  const retailers: Retailer[] = [];
  if (/\bcostco_products\b/i.test(sql)) retailers.push("costco");
  if (/\bwalmart_products\b/i.test(sql)) retailers.push("walmart");
  return retailers;
}

function addSearch(searches: Map<string, Set<Retailer>>, itemId: string, retailers: Retailer[]): void {
  const set = searches.get(itemId) ?? new Set<Retailer>();
  retailers.forEach((retailer) => set.add(retailer));
  searches.set(itemId, set);
}

function taskOutcome(results: ComparisonResult[]): Pick<TraceSummary, "task_outcome" | "review_required"> {
  if (results.some((result) => result.recommendation === "review")) return { task_outcome: "review_required", review_required: true };
  const unavailable = results.filter((result) => result.recommendation === "unavailable").length;
  if (unavailable === results.length) return { task_outcome: "abstained", review_required: false };
  if (unavailable > 0) return { task_outcome: "partial", review_required: false };
  return { task_outcome: "completed", review_required: false };
}

/**
 * A portable version of the live model loop. The caller supplies the model,
 * database executor, and authoritative product resolver; no catalog data,
 * account identifiers, or credentials are included in this reference.
 */
export async function runReferenceAgent(input: AgentRunInput, dependencies: AgentDependencies): Promise<{ results: ComparisonResult[]; trace: TraceSummary; warnings: string[] }> {
  if (!input.items.length) throw new Error("at least one reviewed item is required");
  const now = dependencies.now ?? Date.now;
  const started = now();
  const promptVersion = input.promptVersion ?? "B";
  const maxToolCalls = Math.max(AGENT_CONTRACT.execution.minimumToolCalls, input.items.length * AGENT_CONTRACT.execution.toolCallsPerItem);
  const messages: ChatMessage[] = [
    { role: "system", content: getPrompt(promptVersion) },
    { role: "user", content: JSON.stringify({ items: input.items, shopper_preferences: input.shopperPreferences ?? {} }) },
  ];
  const spans: ToolCallSpan[] = [];
  const warnings: string[] = [];
  const evidence = new Map<string, CatalogProduct>();
  const attempted = new Map<string, Set<Retailer>>();
  const completed = new Map<string, Set<Retailer>>();
  let toolCalls = 0;
  let retries = 0;
  let errors = 0;
  let modelCalls = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let stopReason: TraceSummary["stop_reason"] = "completed";
  let finished = false;

  for (let round = 0; round < AGENT_CONTRACT.execution.maxModelRounds && !finished; round += 1) {
    const elapsed = now() - started;
    if (elapsed >= AGENT_CONTRACT.execution.maxLatencyMs) throw new Error("agent model processing exceeded the 195-second deadline");
    if (promptTokens + completionTokens >= AGENT_CONTRACT.execution.maxTotalTokens) {
      warnings.push("Agent stopped at the configured token budget.");
      stopReason = "token_budget_exhausted";
      break;
    }
    modelCalls += 1;
    const modelStarted = now();
    const reply = await dependencies.model.complete({
      model: input.modelName ?? "gpt-4o-mini",
      messages,
      tools: TOOLS,
      maxCompletionTokens: AGENT_CONTRACT.execution.maxCompletionTokens,
      signal: AbortSignal.timeout(AGENT_CONTRACT.execution.maxLatencyMs - elapsed),
    });
    promptTokens += reply.promptTokens ?? 0;
    completionTokens += reply.completionTokens ?? 0;
    spans.push({ name: "model.chat_completions", input: { round, prompt_version: promptVersion }, output: { finish_reason: reply.finishReason ?? null, tool_call_count: reply.message.tool_calls?.length ?? 0, prompt_tokens: reply.promptTokens ?? 0, completion_tokens: reply.completionTokens ?? 0 }, status: "ok", duration_ms: now() - modelStarted, llm_input_messages: messages.map((message) => ({ ...message })), llm_output_messages: [{ role: "assistant", ...reply.message }], llm_tools: TOOLS.map((tool) => ({ ...tool })) });
    messages.push({ role: "assistant", ...reply.message });
    if (!reply.message.tool_calls?.length) {
      finished = true;
      break;
    }

    for (const call of reply.message.tool_calls) {
      if (toolCalls >= maxToolCalls) {
        warnings.push("Tool-call budget reached; the agent stopped before another tool call.");
        stopReason = "tool_budget_exhausted";
        finished = true;
        break;
      }
      toolCalls += 1;
      const toolStarted = now();
      try {
        const args = parseArguments(call.function.arguments);
        if (call.function.name === SCHEMA_TOOL_NAME) {
          const schema = inspectCatalogSchema();
          spans.push({ name: SCHEMA_TOOL_NAME, input: {}, output: { table_count: 2 }, status: "ok", duration_ms: now() - toolStarted });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(schema) });
          continue;
        }
        if (call.function.name !== SQL_TOOL_NAME) throw new Error(`unsupported tool: ${call.function.name}`);
        if (typeof args.item_id !== "string" || !input.items.some((item) => item.item_id === args.item_id)) throw new Error("item_id is not part of this request");
        if (typeof args.sql !== "string") throw new Error("sql is required");
        const retailers = referencedRetailers(args.sql);
        addSearch(attempted, args.item_id, retailers);
        const execution = await executeCatalogSql(dependencies.executeSql, args.sql, input.resultLimit);
        const status = execution.policy.allowed && !execution.error ? "ok" : "error";
        if (status === "error") {
          errors += 1;
          retries += 1;
        } else addSearch(completed, args.item_id, retailers);
        const evidenceIds: string[] = [];
        for (const row of execution.rows) {
          if ((row.retailer !== "costco" && row.retailer !== "walmart") || typeof row.source_row_id !== "string") continue;
          const retailer = row.retailer as Retailer;
          const product = await dependencies.resolveProduct(retailer, row.source_row_id);
          if (!product) continue;
          evidenceIds.push(product.source_row_id);
          evidence.set(`${args.item_id}|${retailer}`, product);
        }
        spans.push({ name: SQL_TOOL_NAME, input: { item_id: args.item_id, sql: args.sql, purpose: typeof args.purpose === "string" ? args.purpose : "" }, output: { policy_allowed: execution.policy.allowed, policy_reason: execution.policy.reason, row_count: execution.rowCount, truncated: execution.truncated, evidence_ids: evidenceIds }, status, error: execution.error ?? (execution.policy.allowed ? undefined : `SQL policy rejected: ${execution.policy.reason}`), duration_ms: now() - toolStarted });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ policy: execution.policy, rows: execution.rows, row_count: execution.rowCount, truncated: execution.truncated, error: execution.error }) });
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        spans.push({ name: call.function.name, input: { raw_arguments: call.function.arguments }, status: "error", error: message, duration_ms: now() - toolStarted });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: message }) });
      }
    }
  }
  if (!finished && stopReason === "completed") {
    stopReason = "round_budget_exhausted";
    warnings.push("Model reached the round limit; recommendations use only evidence collected so far.");
  }
  if (finished && errors > 0 && stopReason === "completed") stopReason = "recovered";
  const results = input.items.map((item) => finalizeRecommendation(item, evidence.get(`${item.item_id}|costco`) ?? null, evidence.get(`${item.item_id}|walmart`) ?? null, input.shopperPreferences ?? {}, input.evidenceThreshold ?? "strong", completed.get(item.item_id) ?? [], attempted.get(item.item_id) ?? []));
  const searchedItems = results.filter((result) => result.search_status === "complete").length;
  const outcome = taskOutcome(results);
  spans.push({ name: "validate_comparison", input: { items: input.items, shopper_preferences: input.shopperPreferences ?? {} }, output: { results, task_outcome: outcome.task_outcome, review_required: outcome.review_required, stop_reason: stopReason }, status: "ok", duration_ms: 0 });
  return {
    results,
    warnings,
    trace: {
      run_id: (dependencies.newRunId ?? crypto.randomUUID)(),
      agent_id: AGENT_CONTRACT.identity.agentId,
      contract_version: contractVersionForRun(input.experimentName),
      policy_version: promptVersion === "C" ? "search-policy-v2.2" : AGENT_CONTRACT.identity.policyVersion,
      lifecycle_state: AGENT_CONTRACT.identity.lifecycleState,
      deployment_environment: input.deploymentEnvironment ?? "demo",
      dataset_version_costco: input.datasetVersionCostco ?? "costco-runtime-v1",
      dataset_version_walmart: input.datasetVersionWalmart ?? "walmart-runtime-v1",
      prompt_version: promptVersion,
      ...outcome,
      stop_reason: stopReason,
      spans,
      stats: { tool_calls: toolCalls, retries, errors, model_calls: modelCalls, prompt_tokens: promptTokens, completion_tokens: completionTokens, searched_items: searchedItems, unresolved_items: results.length - searchedItems, elapsed_ms: now() - started },
    },
  };
}
