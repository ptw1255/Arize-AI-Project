import { context, SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BasicTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  INPUT_MIME_TYPE,
  INPUT_VALUE,
  LLM_MODEL_NAME,
  LLM_PROVIDER,
  LLM_TOKEN_COUNT_COMPLETION,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_TOTAL,
  MimeType,
  OpenInferenceSpanKind,
  OUTPUT_MIME_TYPE,
  OUTPUT_VALUE,
  SEMRESATTRS_PROJECT_NAME,
  SemanticConventions,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  TOOL_PARAMETERS,
} from "@arizeai/openinference-semantic-conventions";
import type { ToolCallSpan, TraceSummary } from "./types.ts";

export type ArizeExportConfig = {
  apiKey: string;
  spaceId: string;
  projectName?: string;
  modelName?: string;
  endpoint?: string;
};

const TOOL_METADATA: Record<string, { description: string; parameters: Record<string, unknown> }> = {
  inspect_catalog_schema: { description: "Inspect the bounded SQLite catalog schema before writing SQL.", parameters: { type: "object", properties: {} } },
  execute_catalog_query: { description: "Execute model-authored, read-only SQL through the policy gateway.", parameters: { type: "object", required: ["item_id", "sql", "purpose"] } },
};

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function spanKind(span: ToolCallSpan): OpenInferenceSpanKind {
  if (span.name.startsWith("model.")) return OpenInferenceSpanKind.LLM;
  if (span.name === "inspect_catalog_schema" || span.name === "execute_catalog_query") return OpenInferenceSpanKind.TOOL;
  return OpenInferenceSpanKind.CHAIN;
}

function spanAttributes(span: ToolCallSpan, summary: TraceSummary, modelName: string): Attributes {
  const kind = spanKind(span);
  const attributes: Attributes = {
    [SemanticConventions.OPENINFERENCE_SPAN_KIND]: kind,
    [INPUT_VALUE]: json(span.input),
    [INPUT_MIME_TYPE]: MimeType.JSON,
    [OUTPUT_VALUE]: json(span.output),
    [OUTPUT_MIME_TYPE]: MimeType.JSON,
    "agent.run_id": summary.run_id,
    "agent.id": summary.agent_id,
    "agent.contract_version": summary.contract_version,
    "agent.policy_version": summary.policy_version,
    "agent.lifecycle_state": summary.lifecycle_state,
    "agent.prompt_version": summary.prompt_version,
    "deployment.environment": summary.deployment_environment,
    "dataset.version.costco": summary.dataset_version_costco,
    "dataset.version.walmart": summary.dataset_version_walmart,
  };
  if (span.error) attributes["error.message"] = span.error;
  if (kind === OpenInferenceSpanKind.LLM) {
    const promptTokens = typeof span.output?.prompt_tokens === "number" ? span.output.prompt_tokens : 0;
    const completionTokens = typeof span.output?.completion_tokens === "number" ? span.output.completion_tokens : 0;
    attributes[LLM_MODEL_NAME] = modelName;
    attributes[LLM_PROVIDER] = "openai";
    attributes[LLM_TOKEN_COUNT_PROMPT] = promptTokens;
    attributes[LLM_TOKEN_COUNT_COMPLETION] = completionTokens;
    attributes[LLM_TOKEN_COUNT_TOTAL] = promptTokens + completionTokens;
  }
  if (kind === OpenInferenceSpanKind.TOOL) {
    const metadata = TOOL_METADATA[span.name];
    attributes[TOOL_NAME] = span.name;
    attributes[TOOL_DESCRIPTION] = metadata.description;
    attributes[TOOL_PARAMETERS] = json(metadata.parameters);
    attributes["eval.tool_call"] = json({ name: span.name, arguments: span.input });
    if (span.name === "execute_catalog_query") {
      attributes["eval.sql.question"] = String(span.input.purpose ?? "Search the retailer catalog for the requested grocery item.");
      attributes["eval.sql.output"] = String(span.input.sql ?? "");
    }
  }
  return attributes;
}

/**
 * Exports a completed reference-agent trace by OTLP/protobuf using OpenInference
 * span attributes. The caller supplies Arize credentials at runtime; none are
 * stored in this repository.
 */
export async function exportTraceToArize(config: ArizeExportConfig, summary: TraceSummary): Promise<string> {
  const projectName = config.projectName ?? "arize-grocery-agent";
  const exporter = new OTLPTraceExporter({
    url: config.endpoint ?? "https://otlp.arize.com/v1/traces",
    headers: { "arize-space-id": config.spaceId, "arize-api-key": config.apiKey },
  });
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "arize-grocery-agent", [SEMRESATTRS_PROJECT_NAME]: projectName, model_id: projectName }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  const tracer = provider.getTracer("arize-grocery-agent", "1.0.0");
  const started = Date.now() - summary.stats.elapsed_ms;
  const root = tracer.startSpan("compare_grocery_prices", {
    startTime: new Date(started),
    attributes: {
      [SemanticConventions.OPENINFERENCE_SPAN_KIND]: OpenInferenceSpanKind.AGENT,
      [INPUT_VALUE]: json({ prompt_version: summary.prompt_version }),
      [INPUT_MIME_TYPE]: MimeType.JSON,
      "agent.run_id": summary.run_id,
      "agent.id": summary.agent_id,
      "agent.contract_version": summary.contract_version,
      "agent.policy_version": summary.policy_version,
      "agent.task_outcome": summary.task_outcome,
      "agent.stop_reason": summary.stop_reason,
      "agent.review_required": summary.review_required,
      "eval.tool_calls": json(summary.spans.filter((span) => spanKind(span) === OpenInferenceSpanKind.TOOL).map((span) => ({ name: span.name, input: span.input, output: span.output ?? null }))),
      "eval.tool_definitions": json(TOOL_METADATA),
    },
  });
  const rootContext = trace.setSpan(context.active(), root);
  for (const [index, summarySpan] of summary.spans.entries()) {
    const startTime = new Date(started + index);
    const child = tracer.startSpan(summarySpan.name, { startTime, attributes: spanAttributes(summarySpan, summary, config.modelName ?? "gpt-4o-mini") }, rootContext);
    if (summarySpan.error) child.recordException(new Error(summarySpan.error));
    child.setStatus({ code: summarySpan.status === "ok" ? SpanStatusCode.OK : SpanStatusCode.ERROR, ...(summarySpan.error ? { message: summarySpan.error } : {}) });
    child.end(new Date(startTime.getTime() + Math.max(summarySpan.duration_ms, 1)));
  }
  root.setAttribute(OUTPUT_VALUE, json({ task_outcome: summary.task_outcome, stop_reason: summary.stop_reason }));
  root.setAttribute(OUTPUT_MIME_TYPE, MimeType.JSON);
  root.setStatus({ code: summary.stats.errors ? SpanStatusCode.ERROR : SpanStatusCode.OK });
  const traceId = root.spanContext().traceId;
  root.end();
  try {
    await provider.forceFlush();
    return traceId;
  } finally {
    await provider.shutdown();
  }
}
