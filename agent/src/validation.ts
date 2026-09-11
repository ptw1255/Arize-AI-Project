import type { CatalogProduct, ComparisonResult, GroceryItem, PriceComparison, PriceComparisonState, Retailer, ShopperPreferences } from "./types.ts";

type EvidenceThreshold = "strong" | "weak";
type PackageDimension = "mass" | "volume" | "count";
type ParsedPackage = { dimension: PackageDimension; amount: number };

const PACKAGE_UNITS: Record<string, { dimension: PackageDimension; multiplier: number }> = {
  g: { dimension: "mass", multiplier: 1 }, kg: { dimension: "mass", multiplier: 1_000 }, oz: { dimension: "mass", multiplier: 28.349523125 }, lb: { dimension: "mass", multiplier: 453.59237 },
  ml: { dimension: "volume", multiplier: 1 }, l: { dimension: "volume", multiplier: 1_000 }, "fl oz": { dimension: "volume", multiplier: 29.5735295625 },
  ct: { dimension: "count", multiplier: 1 }, count: { dimension: "count", multiplier: 1 },
};

function packageUnit(value: string): keyof typeof PACKAGE_UNITS | null {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return normalized in PACKAGE_UNITS ? normalized as keyof typeof PACKAGE_UNITS : null;
}

function parsedPackage(amount: number, unitText: string, multiplier = 1): ParsedPackage | null {
  const unit = packageUnit(unitText);
  if (!unit || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(multiplier) || multiplier <= 0) return null;
  const definition = PACKAGE_UNITS[unit];
  return { dimension: definition.dimension, amount: amount * multiplier * definition.multiplier };
}

function parsePackageSize(value: string | null | undefined): { parsed?: ParsedPackage; state?: PriceComparisonState } {
  if (!value?.trim()) return { state: "missing_package_size" };
  const raw = value.toLowerCase().replace(/×/g, "x").replace(/\s+/g, " ").trim();
  const multiplied = raw.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lb|kg|g|ml|l|ct|count)\s*$/);
  if (multiplied) return { parsed: parsedPackage(Number(multiplied[2]), multiplied[3], Number(multiplied[1])) ?? undefined, state: "unparseable_package_size" };
  const reversedMultiplier = raw.match(/^(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lb|kg|g|ml|l|ct|count)\s*x\s*(\d+(?:\.\d+)?)\s*$/);
  if (reversedMultiplier) return { parsed: parsedPackage(Number(reversedMultiplier[1]), reversedMultiplier[2], Number(reversedMultiplier[3])) ?? undefined, state: "unparseable_package_size" };
  const simple = raw.match(/^(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lb|kg|g|ml|l|ct|count)\s*(?:bottle|bag|box|can|jar|loaf)?\s*$/);
  if (simple) return { parsed: parsedPackage(Number(simple[1]), simple[2]) ?? undefined, state: "unparseable_package_size" };
  if (/\b(?:multipack|multi-pack|pack|pk)\b/.test(raw) || /\d+\s*(?:x|-)\s*\d+/.test(raw) || /\d+\s*(?:ct|count)\b.*\d+\s*(?:fl\s*oz|oz|lb|kg|g|ml|l)\b/.test(raw)) return { state: "ambiguous_multipack" };
  return { state: "unparseable_package_size" };
}

function hasOmittedMultipackCount(product: CatalogProduct): boolean {
  const name = product.product_name.toLowerCase();
  const packageSize = product.package_size_text?.toLowerCase() ?? "";
  return (/\b\d+(?:\s|-)*(?:count|ct)\b|\b(?:pack|pk)\s+of\s+\d+\b/.test(name)) && !(/\b\d+(?:\s|-)*(?:count|ct)\b|\b\d+\s*x\s*\d+/.test(packageSize));
}

/** Contract 0.2.1 compares sticker prices only after equivalent packages are established. */
export function packageComparison(costco: CatalogProduct | null, walmart: CatalogProduct | null): PriceComparison {
  if (!costco || !walmart) return { state: "not_applicable" };
  if (costco.currency !== walmart.currency) return { state: "currency_mismatch" };
  if (hasOmittedMultipackCount(costco) || hasOmittedMultipackCount(walmart)) return { state: "ambiguous_multipack" };
  const costcoPackage = parsePackageSize(costco.package_size_text);
  const walmartPackage = parsePackageSize(walmart.package_size_text);
  if (!costcoPackage.parsed) return { state: costcoPackage.state ?? "unparseable_package_size" };
  if (!walmartPackage.parsed) return { state: walmartPackage.state ?? "unparseable_package_size" };
  if (costcoPackage.parsed.dimension !== walmartPackage.parsed.dimension) return { state: "incompatible_package_units" };
  const difference = Math.abs(costcoPackage.parsed.amount - walmartPackage.parsed.amount);
  const tolerance = costcoPackage.parsed.dimension === "count" ? 0 : Math.max(costcoPackage.parsed.amount, walmartPackage.parsed.amount) * 0.01;
  return { state: difference <= tolerance ? "equivalent_package" : "different_package_sizes" };
}

export function chooseRecommendation(item: GroceryItem, costco: CatalogProduct | null, walmart: CatalogProduct | null, preferences: ShopperPreferences, evidenceThreshold: EvidenceThreshold = "strong"): ComparisonResult {
  const searched_retailers: Retailer[] = ["costco", "walmart"];
  const evidence = [costco, walmart].filter(Boolean) as CatalogProduct[];
  const trusted = (product: CatalogProduct | null): product is CatalogProduct => product !== null && (product.match_strength === "strong" || (evidenceThreshold === "weak" && product.match_strength === "weak_context"));
  if (!evidence.length) return { item_id: item.item_id, requested_name: item.name, recommendation: "unavailable", rationale: "No grounded product match was returned by either retailer tool.", costco, walmart, evidence_level: "none", search_status: "complete", searched_retailers, price_comparison: { state: "not_applicable" } };
  if (!evidence.some(trusted)) return { item_id: item.item_id, requested_name: item.name, recommendation: "review", rationale: "Only weak or noisy matches were found; ask the shopper to review before buying.", costco, walmart, evidence_level: "weak", search_status: "complete", searched_retailers, price_comparison: { state: "not_applicable" } };
  const trustedCostco = trusted(costco) ? costco : null;
  const trustedWalmart = trusted(walmart) ? walmart : null;
  if (trustedCostco && !trustedWalmart) return { item_id: item.item_id, requested_name: item.name, recommendation: preferences.costco_membership === false ? "review" : "costco", rationale: preferences.costco_membership === false ? "A Costco match exists, but the shopper has no Costco membership." : "Only Costco has a strong grounded match.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: { state: "not_applicable" } };
  if (trustedWalmart && !trustedCostco) return { item_id: item.item_id, requested_name: item.name, recommendation: "walmart", rationale: "Only Walmart has a strong grounded match.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: { state: "not_applicable" } };
  if (!trustedCostco || !trustedWalmart) throw new Error("unreachable comparison state");

  const comparison = packageComparison(trustedCostco, trustedWalmart);
  if (preferences.costco_membership === false) return { item_id: item.item_id, requested_name: item.name, recommendation: "walmart", rationale: "Walmart is accessible because the shopper does not have a Costco membership.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: comparison };
  if (comparison.state !== "equivalent_package") return { item_id: item.item_id, requested_name: item.name, recommendation: "review", rationale: "Both retailers have grounded matches, but their package sizes cannot be compared defensibly.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: comparison };
  const sensitivity = item.price_sensitivity ?? preferences.price_sensitivity ?? "medium";
  const bulk = item.bulk_tolerance ?? preferences.bulk_tolerance ?? "medium";
  const costcoAdvantage = trustedCostco.price_current <= trustedWalmart.price_current * 0.9;
  const walmartAdvantage = trustedWalmart.price_current <= trustedCostco.price_current * 0.9;
  if (costcoAdvantage && bulk !== "low") return { item_id: item.item_id, requested_name: item.name, recommendation: "costco", rationale: "Costco is at least 10% cheaper for an equivalent package in this snapshot and the shopper accepts bulk purchase.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: comparison };
  if (walmartAdvantage || bulk === "low") return { item_id: item.item_id, requested_name: item.name, recommendation: "walmart", rationale: bulk === "low" ? "Walmart is the better fit because the shopper prefers to avoid bulk purchase." : "Walmart is at least 10% cheaper for an equivalent package in this snapshot.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: comparison };
  return { item_id: item.item_id, requested_name: item.name, recommendation: sensitivity === "high" ? "review" : "either", rationale: "Both retailers have grounded matches and the equivalent-package price difference is not decisive.", costco, walmart, evidence_level: "strong", search_status: "complete", searched_retailers, price_comparison: comparison };
}

/** The final boundary prevents unavailable when a retailer search did not complete. */
export function finalizeRecommendation(item: GroceryItem, costco: CatalogProduct | null, walmart: CatalogProduct | null, preferences: ShopperPreferences, evidenceThreshold: EvidenceThreshold, completedRetailers: Iterable<Retailer>, attemptedRetailers: Iterable<Retailer>): ComparisonResult {
  const completed = [...new Set(completedRetailers)].sort() as Retailer[];
  if (completed.length === 2) return chooseRecommendation(item, costco, walmart, preferences, evidenceThreshold);
  const attempted = [...new Set(attemptedRetailers)].sort() as Retailer[];
  const searchStatus = attempted.length > completed.length ? "failed" : "incomplete";
  return { item_id: item.item_id, requested_name: item.name, recommendation: "review", rationale: searchStatus === "failed" ? "A retailer search failed before comparable evidence was collected; review is required." : "The agent stopped before both retailer searches completed; this item is unresolved.", costco, walmart, evidence_level: costco || walmart ? "weak" : "none", search_status: searchStatus, searched_retailers: completed, price_comparison: { state: "not_applicable" } };
}
