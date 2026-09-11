# Agent definition — Grocery comparison agent

## Identity

| Field | Value |
| --- | --- |
| Agent ID | `grocery-comparison-agent` |
| Contract version | `0.2.1` |
| Deployed demo policy | `search-policy-v1` |
| Lifecycle | `limited` |
| Environment | Demonstration |
| Owner | Parker Wall |

## Contract lineage

The Part 1 diagnostic trace `8dda9755f410fbdb64660809779cd9fe` ran under contract `0.1.0`. It exposed a state error: seven items received no retailer searches but were described as unavailable.

Contract `0.2.0` moved the corrective rule into the runtime: `unavailable` requires completed Costco and Walmart searches; incomplete or failed searches return `review`. The controlled Prompt B and Prompt C experiments both used `0.2.0`. This contract correction is not evidence that Prompt C performed better.

The current deployed contract is `0.2.1`. It adds a conservative package-equivalence guard: the app compares snapshot prices only when both supported products use the same currency and have equivalent, unambiguously parsed mass, volume, or count. Mass and volume accept up to 1% label rounding; count is exact. A product-name multipack count omitted from the package field is ambiguous. Other package states return `review` unless a shopper-access constraint decides the outcome. This is not general unit-price optimization, and it does not alter the completed B/C experiment record.

## Purpose

The agent helps a shopper decide which reviewed grocery items to buy at Costco or Walmart. It searches frozen retailer catalogs, collects product evidence, and returns an item-level result.

The agent does not claim live prices or inventory, place orders, create carts, or make the purchase for the customer.

## Why the agent can write SQL

I intentionally gave the model more search freedom than a fixed catalog-search function would provide. The model inspects the schema and writes its own read-only SQL.

That choice made the behavior worth observing. The traces show:

- how the model translated a grocery item into a query;
- whether it searched both retailers;
- which rows it treated as evidence;
- when lexical overlap produced an irrelevant candidate;
- whether an error produced a useful reformulation or repeated failure;
- how much latency, token, and tool-call budget the search consumed;
- why the agent stopped.

A fixed search function would have hidden most of that behavior inside application code. The assignment asked me to use traces and evaluations to improve an agent, so I kept search quality inside the agent's decision boundary.

The freedom is bounded. The application permits read-only, single-statement queries, blocks administrative operations and system tables, limits returned rows, caps model and tool work, and constructs the final response from validated evidence. Query quality remains open to failure; data mutation and purchasing authority do not.

![Governed agent authority and application enforcement](../assets/architecture/governed-agent-authority.svg)

## Inputs

- one or more customer-reviewed grocery items;
- stable item ID and item name;
- optional quantity and unit;
- optional Costco membership, bulk tolerance, and price sensitivity.

Images and OCR output are outside the agent boundary. The agent starts after the customer reviews the structured list.

## Tools

### `inspect_catalog_schema`

Shows the two demonstration catalog schemas and the fields available for evidence.

### `execute_catalog_query`

Accepts the reviewed item ID, one model-authored read-only SQL statement, and a short statement of purpose. The application returns rows, errors, policy decisions, truncation state, and evidence IDs to the agent and the trace.

## Deployed demo prompt

Prompt B is the deployed demo baseline:

> You are a governed grocery comparison agent using a SQLite demonstration catalog. Inspect the schema once, then write your own read-only SQL to gather comparable Costco and Walmart evidence for each approved item. Include source_row_id, retailer, product_name, price_current, package_size_text, and match_strength. Treat SQL errors, empty results, and truncated results as evidence about your search strategy: make a materially different retry when useful, avoid repeating queries that add no evidence, and stop when further querying is unlikely to improve the comparison. Never invent missing data or claim that snapshot data is live. The server validates evidence and constructs the final recommendation.

## Required result

Every requested item must return:

- the original item ID and name;
- `costco`, `walmart`, `either`, `unavailable`, or `review`;
- Costco and Walmart evidence when available;
- `strong`, `weak`, or `none` evidence;
- `complete`, `incomplete`, or `failed` search status;
- the retailers searched successfully;
- machine-readable package-comparison state: `equivalent_package`, `different_package_sizes`, `incompatible_package_units`, `missing_package_size`, `unparseable_package_size`, `ambiguous_multipack`, `currency_mismatch`, or `not_applicable`;
- a short rationale supported by the evidence.

`Unavailable` requires completed searches at both retailers. Incomplete or failed searches return `review`.

## Operating limits

- maximum eight model rounds;
- tool-call allowance scales with list size;
- 195-second processing deadline;
- prompt and completion-token budgets;
- bounded SQL length and returned rows;
- server-controlled prompt, policy, model, catalog, and environment versions;
- emergency disable switch;
- rate limits on authentication, OCR, API, and model-executing agent requests.

## Trace contract

Each successful run records:

- agent, contract, policy, prompt, model, catalog, and environment versions;
- model and tool calls;
- model-authored SQL;
- policy decisions, query errors, row counts, truncation, and evidence IDs;
- latency, tokens, calls, retries, and errors;
- searched and unresolved item counts;
- task outcome, stop reason, and review state.

The trace records execution evidence. Evaluations determine whether the evidence and customer result were good.

## Experiment history

Both experiment variants used contract `0.2.0`; only the prompt and search-policy version changed.

Prompt C v2.2 added coverage tracking, concept normalization, category checks, and bounded reformulation. It completed 17 of 17 item searches, compared with Prompt B's 10 of 17. Critical relevance fell from three of four cases to zero of four, elapsed time increased 93.9%, tool calls increased 45.8%, and completion tokens increased 132.5%.

Prompt C was rejected. Prompt B remains the deployed demo baseline.

## Known boundary

The current agent is designed for observation in a limited demonstration. A production version would require stronger query parsing and catalog isolation, live authorized data connectors, complete failure-safe trace export, agreed quality and operating thresholds, and a tested rollback process.

## Executable reference

The [scrubbed executable reference](../agent/README.md) contains the deployed contract, prompts, tool schemas, model/tool loop, SQL policy gateway, final-state validation rule, and OpenInference/OTLP trace exporter. It removes credentials, account and environment identifiers, catalog rows, generated data, local paths, and unrelated application code.
