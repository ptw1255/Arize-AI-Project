export type Retailer = "costco" | "walmart";
export type PromptVersion = "A" | "B" | "C";

export type GroceryItem = {
  item_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  price_sensitivity?: "low" | "medium" | "high";
  bulk_tolerance?: "low" | "medium" | "high";
};

export type ShopperPreferences = {
  costco_membership?: boolean;
  bulk_tolerance?: "low" | "medium" | "high";
  price_sensitivity?: "low" | "medium" | "high";
};

export type CatalogProduct = {
  source_row_id: string;
  retailer: Retailer;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  package_size_text?: string | null;
  price_current: number;
  currency: string;
  in_stock?: boolean | null;
  match_strength: "strong" | "weak_context" | "noise";
};

export type ComparisonResult = {
  item_id: string;
  requested_name: string;
  recommendation: "costco" | "walmart" | "either" | "unavailable" | "review";
  rationale: string;
  costco: CatalogProduct | null;
  walmart: CatalogProduct | null;
  evidence_level: "strong" | "weak" | "none";
  search_status: "complete" | "incomplete" | "failed";
  searched_retailers: Retailer[];
  price_comparison: PriceComparison;
};

export type PriceComparisonState =
  | "equivalent_package"
  | "different_package_sizes"
  | "incompatible_package_units"
  | "missing_package_size"
  | "unparseable_package_size"
  | "ambiguous_multipack"
  | "currency_mismatch"
  | "not_applicable";

export type PriceComparison = { state: PriceComparisonState };

export type ToolCallSpan = {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "ok" | "error";
  error?: string;
  duration_ms: number;
  llm_input_messages?: Array<Record<string, unknown>>;
  llm_output_messages?: Array<Record<string, unknown>>;
  llm_tools?: Array<Record<string, unknown>>;
};

export type TraceSummary = {
  run_id: string;
  agent_id: string;
  contract_version: string;
  policy_version: string;
  lifecycle_state: "limited";
  deployment_environment: string;
  dataset_version_costco: string;
  dataset_version_walmart: string;
  prompt_version: PromptVersion;
  task_outcome: "completed" | "partial" | "abstained" | "review_required";
  stop_reason: "completed" | "recovered" | "tool_budget_exhausted" | "round_budget_exhausted" | "token_budget_exhausted";
  review_required: boolean;
  spans: ToolCallSpan[];
  stats: {
    tool_calls: number;
    retries: number;
    errors: number;
    model_calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    searched_items: number;
    unresolved_items: number;
    elapsed_ms: number;
  };
};
