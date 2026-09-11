/** The immutable authority and execution envelope used by the hosted demo. */
export const AGENT_CONTRACT = {
  identity: {
    agentId: "grocery-comparison-agent",
    contractVersion: "0.2.1",
    policyVersion: "search-policy-v1",
    lifecycleState: "limited" as const,
  },
  tools: ["inspect_catalog_schema", "execute_catalog_query"] as const,
  request: {
    minItems: 1,
  },
  execution: {
    maxModelRounds: 8,
    minimumToolCalls: 32,
    toolCallsPerItem: 3,
    maxSqlCharacters: 4_000,
    defaultResultRows: 8,
    maxResultRows: 20,
    defaultLatencyMs: 195_000,
    maxLatencyMs: 195_000,
    defaultTotalTokens: 24_000,
    maxTotalTokens: 100_000,
    defaultCompletionTokens: 4_000,
    maxCompletionTokens: 4_000,
  },
  rateLimits: {
    authentication: { limit: 10, periodSeconds: 60 },
    api: { limit: 30, periodSeconds: 60 },
    ocr: { limit: 6, periodSeconds: 60 },
    agent: { limit: 6, periodSeconds: 60 },
  },
  sql: {
    allowedStatementPrefixes: ["SELECT", "WITH"] as const,
    commentsAllowed: false,
    multipleStatementsAllowed: false,
    systemTablesAllowed: false,
    mutationsAllowed: false,
  },
  priceComparisonStates: [
    "equivalent_package",
    "different_package_sizes",
    "incompatible_package_units",
    "missing_package_size",
    "unparseable_package_size",
    "ambiguous_multipack",
    "currency_mismatch",
    "not_applicable",
  ] as const,
  recommendations: ["costco", "walmart", "either", "unavailable", "review"] as const,
  searchStatuses: ["complete", "incomplete", "failed"] as const,
  outcomes: ["completed", "partial", "abstained", "review_required", "failed"] as const,
} as const;

/** B/C results are historical controlled evidence and retain their executed contract. */
export const EXPERIMENT_CONTRACT_VERSION = "0.2.0";

export function contractVersionForRun(experimentName?: string): string {
  return experimentName ? EXPERIMENT_CONTRACT_VERSION : AGENT_CONTRACT.identity.contractVersion;
}
