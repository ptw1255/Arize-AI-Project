# Scrubbed executable agent reference

This is the smallest coherent reference implementation of the hosted grocery agent's decision boundary. It is extracted from the working Worker, with environment IDs, credentials, catalog rows, generated data, and unrelated application code removed.

It includes the current `0.2.1` agent contract, Prompt B baseline and Prompt C candidate, model tool schemas, portable tool-calling loop, SQL policy gateway, server-side recommendation boundary, and OpenInference/OTLP export to Arize AX.

## What it does not include

- photo upload and OCR;
- the frozen Costco and Walmart catalog rows;
- a D1 binding, Cloudflare account configuration, Basic Auth settings, or rate-limit bindings;
- API keys, Arize space IDs, local paths, or private framework material.

The caller supplies three runtime dependencies: an LLM client, a read-only SQL executor, and a product resolver that returns authoritative rows by retailer and source ID. The reference has no database authority by itself.

## Read path

1. [`src/contract.ts`](src/contract.ts) is the current `0.2.1` execution envelope. It preserves `0.2.0` as the contract used by the completed B/C experiment.
2. [`src/prompts.ts`](src/prompts.ts) contains the deployed Prompt B baseline and rejected Prompt C candidate.
3. [`src/reference-agent.ts`](src/reference-agent.ts) shows the model/tool loop and records a trace summary.
4. [`src/sql-policy.ts`](src/sql-policy.ts) blocks mutating, multi-statement, commented, and system-table SQL, then bounds returned rows. It intentionally does not validate table or column names; those search failures are observable behavior.
5. [`src/validation.ts`](src/validation.ts) applies the final customer-state rule: an item is `unavailable` only after both retailer searches complete. In `0.2.1`, it compares raw snapshot prices only for equivalent, unambiguous packages in the same currency and returns a machine-readable comparison state such as `currency_mismatch` or `different_package_sizes`.
6. [`src/arize-openinference.ts`](src/arize-openinference.ts) converts a completed summary into OTLP/protobuf spans with OpenInference semantic attributes and sends them to Arize at runtime.

## Run the checks

Requires Node.js 22+ and npm. The reference has no secrets or account setup for local checks.

```sh
cd agent
npm install
npm test
npm run typecheck
```

`npm test` runs policy and final-state tests plus a trace-export wiring check. `npm run typecheck` verifies the full TypeScript artifact after dependencies are installed. It does not contact an LLM, a database, or Arize.

## Use it responsibly

The example is a limited demonstration reference, not a production database-security layer. Its policy gateway provides read-only and execution bounds while leaving invalid SQL observable. The package guard is conservative; it does not calculate unit prices or declare different package sizes economically equivalent. A production service needs a true SQL parser or a stricter query interface, isolated credentials, independently tested access controls, authorized live data sources, and failure-safe telemetry delivery.

For the evidence, contract lineage, and experiment decision, see the [agent definition](../docs/AGENT_DEFINITION.md), [Part 1](../docs/PART_1_BUILD_OBSERVE_DIAGNOSE.md), and [Part 2](../docs/PART_2_EVALUATE_IMPROVE_DECIDE.md).
