# Data and evidence boundaries

## Catalog sources

- **Costco:** [Grocery Store Dataset](https://www.kaggle.com/datasets/bhavikjikadara/grocery-store-dataset), published by Bhavik Jikadara. Kaggle's dataset metadata listed Attribution 4.0 International (CC BY 4.0) when rechecked on September 14, 2026.
- **Walmart:** [Walmart Grocery Product Dataset](https://www.kaggle.com/datasets/polartech/walmart-grocery-product-dataset), published by BarkingData. Kaggle's dataset metadata listed CC0: Public Domain when rechecked on September 14, 2026.

The runtime uses priced and deduplicated source rows plus explicitly labeled synthetic additions. Synthetic records expand grocery-category coverage and introduce close variants, ambiguous products, distractors, package differences, prices, and inventory states needed for controlled evaluation.

Synthetic data is test evidence, not retailer fact. Every generated record remains distinguishable through origin and role fields. Prices are treated as snapshot values. Inventory on synthetic rows is simulated. The project makes no claim about current retailer price, promotion, inventory, or local availability.

## Observability evidence

The application emits OpenTelemetry spans with OpenInference semantic attributes. The trace records inputs, outputs, model and tool boundaries, model name, token counts, latency, SQL policy decisions, source-row identifiers, validation outcome, contract, prompt, and policy versions, catalog versions, environment, and stopping behavior.

The trace does not claim to contain hidden chain-of-thought. Credentials remain in managed secrets and are excluded from the repository and screenshots.

## Baseline evidence record

- Trace ID: `8dda9755f410fbdb64660809779cd9fe`
- Contract version: `0.1.0`
- Timestamp: September 10, 2026 at 14:55:46 UTC
- Span count: 25
- Root status: `OK`
- Task outcome: `review_required`
- Stop reason: `round_budget_exhausted`
- End-to-end latency: 18.604 seconds
- Prompt tokens: 29,168
- Completion tokens: 1,020

## Experiment contract record

Contract `0.2.0` was applied before both Prompt B and Prompt C experiment runs. It permits `unavailable` only after completed Costco and Walmart searches; incomplete or failed searches return `review`. Because both variants used this contract, the state correction is not attributed to Prompt C.

## Scrubbed experiment evidence

The [run-level experiment artifact](../evidence/experiment-runs.json) contains all four Prompt B rows and all four Prompt C rows from the authoritative Arize exports. It keeps the case identity needed to follow the comparison, contract and policy versions, coverage, outcome, latency, token and call counts, runtime errors, deterministic relevance, and native evaluator label slots. Missing native labels remain `null`; they are not treated as passes.

The artifact intentionally excludes Arize run and example UUIDs, evaluator IDs, prompts, credentials, URLs, and raw request/response payloads. Its `source_case_id` values are stable scrubbed names derived from the experiment inputs: the 14-item recipe, corn tortillas, black beans, and salsa verde. The artifact records the export locations and timestamps in its source metadata so the provenance boundary is clear without including unnecessary identifiers.

The reconciliation block compares sums derived from the eight rows with the Part 2 table. There are no mismatches. In particular, `searched_items` (not `matched_items`) is the completed-search measure used for the reported 10/17 versus 17/17 result, and native coverage sums non-null labels across 11 expected evaluator slots per row (37/44 versus 36/44).

Arize deep links may require access to the originating workspace. Screenshots and verified exports keep the written argument independent of that access.
