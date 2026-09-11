import assert from "node:assert/strict";
import { finalizeRecommendation, packageComparison } from "../src/validation.ts";

const item = { item_id: "item-1", name: "chicken broth" };

const incomplete = finalizeRecommendation(item, null, null, {}, "strong", ["costco"], ["costco", "walmart"]);
assert.equal(incomplete.recommendation, "review");
assert.equal(incomplete.search_status, "failed");

const completed = finalizeRecommendation(item, null, null, {}, "strong", ["costco", "walmart"], ["costco", "walmart"]);
assert.equal(completed.recommendation, "unavailable");
assert.equal(completed.search_status, "complete");

const product = (retailer, packageSize, price = 5) => ({
  source_row_id: `${retailer}-1`,
  retailer,
  product_name: "Pasta sauce",
  price_current: price,
  currency: "USD",
  package_size_text: packageSize,
  match_strength: "strong",
});
const compare = (costcoSize, walmartSize, costcoPrice = 5, walmartPrice = 5) =>
  finalizeRecommendation(
    item,
    product("costco", costcoSize, costcoPrice),
    product("walmart", walmartSize, walmartPrice),
    {},
    "strong",
    ["costco", "walmart"],
    ["costco", "walmart"],
  );

assert.equal(packageComparison(product("costco", "1 lb"), product("walmart", "16 oz")).state, "equivalent_package");
assert.equal(packageComparison(product("costco", "16 oz"), product("walmart", "24 oz")).state, "different_package_sizes");
assert.equal(packageComparison(product("costco", "16 oz"), product("walmart", "16 count")).state, "incompatible_package_units");
assert.equal(packageComparison(product("costco", null), product("walmart", "16 oz")).state, "missing_package_size");
assert.equal(packageComparison(product("costco", "family size"), product("walmart", "16 oz")).state, "unparseable_package_size");
const walmartDifferentCurrency = { ...product("walmart", "16 oz"), currency: "CAD" };
assert.equal(packageComparison(product("costco", "16 oz"), walmartDifferentCurrency).state, "currency_mismatch");

const equalPrice = compare("16 oz", "1 lb");
assert.equal(equalPrice.recommendation, "either");
const unequalSize = compare("16 oz", "24 oz", 1, 10);
assert.equal(unequalSize.recommendation, "review");
assert.ok(!/unit price/i.test(equalPrice.rationale));
assert.ok(!/unit price/i.test(unequalSize.rationale));

console.log("Validation-boundary and package-equivalence tests passed.");
