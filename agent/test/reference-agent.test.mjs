import assert from "node:assert/strict";
import { runReferenceAgent } from "../src/reference-agent.ts";

let call = 0;
const model = {
  async complete() {
    call += 1;
    if (call === 1) return { message: { tool_calls: [{ id: "schema-1", type: "function", function: { name: "inspect_catalog_schema", arguments: "{}" } }] }, promptTokens: 12, completionTokens: 3 };
    if (call === 2) return { message: { tool_calls: [{ id: "query-1", type: "function", function: { name: "execute_catalog_query", arguments: JSON.stringify({ item_id: "item-1", purpose: "Compare chicken broth across both retailers.", sql: "SELECT source_row_id, retailer FROM costco_products UNION ALL SELECT source_row_id, retailer FROM walmart_products" }) } }] }, promptTokens: 20, completionTokens: 8 };
    return { message: { content: "Evidence gathered." }, promptTokens: 8, completionTokens: 2 };
  },
};

const products = {
  "costco-1": { source_row_id: "costco-1", retailer: "costco", product_name: "Chicken broth", price_current: 4.0, currency: "USD", package_size_text: "32 oz", match_strength: "strong" },
  "walmart-1": { source_row_id: "walmart-1", retailer: "walmart", product_name: "Chicken broth", price_current: 3.0, currency: "USD", package_size_text: "32 oz", match_strength: "strong" },
};

const result = await runReferenceAgent(
  { items: [{ item_id: "item-1", name: "chicken broth" }], modelName: "gpt-4o-mini" },
  {
    model,
    async executeSql() { return [{ source_row_id: "costco-1", retailer: "costco" }, { source_row_id: "walmart-1", retailer: "walmart" }]; },
    async resolveProduct(_retailer, sourceRowId) { return products[sourceRowId] ?? null; },
    newRunId: () => "reference-run",
  },
);

assert.equal(result.results[0].recommendation, "walmart");
assert.equal(result.results[0].search_status, "complete");
assert.equal(result.results[0].price_comparison.state, "equivalent_package");
assert.equal(result.trace.run_id, "reference-run");
assert.equal(result.trace.stats.model_calls, 3);
assert.equal(result.trace.spans.at(-1)?.name, "validate_comparison");
console.log("Reference-agent loop test passed.");
