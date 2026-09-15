# Experiment design

## Preregistration record

This document preserves the plan written before the controlled Prompt B/C runs. The future tense in the preregistered sections is intentional: it records the hypothesis, controls, measures, and decision rule that were set before comparison outcomes were reviewed.

**Execution metadata added after preregistration**

- **Controlled execution date:** 2026-09-10
- **Baseline lineage:** Prompt B / `search-policy-v1`
- **Final candidate lineage:** Prompt C / `search-policy-v2.2` after bounded preflight revisions
- **Verified outcomes and decision:** [Part 2: Evaluate, improve, and decide](PART_2_EVALUATE_IMPROVE_DECIDE.md)

No outcomes or comparison results have been inserted into the preregistered sections below.

## Controlled configuration record

This post-run record names the configuration used for both variants. It separates the model that executed the agent from the models behind Arize-native evaluators.

| Component | Controlled setting | Evidence boundary |
| --- | --- | --- |
| Agent model | OpenAI `gpt-4o-mini` through an OpenAI-compatible interface | The 25-span Prompt B diagnostic trace `8dda9755f410fbdb64660809779cd9fe` contains eight LLM spans; every `llm.model_name` value is `gpt-4o-mini`. Prompt B and Prompt C then used the same Worker model configuration. The scrubbed experiment export does not repeat the model field, so the trace is the retained model-lineage record. |
| Agent generation | Temperature `0`; `max_completion_tokens` `4,000`; tool choice `auto` | `top_p`, seed, and other provider defaults were not set or captured. |
| Agent contract and lifecycle | Contract `0.2.0`; lifecycle `limited`; environment `demo` | Both variants used the same state invariant: incomplete or failed searches return `review`. |
| Prompt and policy | B / `search-policy-v1`; C / `search-policy-v2.2` | The prompt/policy pair was the intended independent variable. |
| Worker path | Authenticated `POST /api/experiment`; normal scenario; model-executing mode; B/C selection only | The hosted demo remained pinned to Prompt B. |
| Catalogs | Frozen D1 snapshots: `costco-runtime-v1` and `walmart-runtime-v1` | The catalogs are demonstration data, not live price, inventory, promotion, or local-store data. |
| Evaluation dataset | `grocery-agent-regression-cases`, version `prompt-b-vs-c-reference-v1` | Four observed trace-derived cases with reference behavior; the same version was used for B and C. |
| Arize-native evaluator groups | Eight span-template evaluators and three trace-template evaluators | Their models are provider-managed by Arize. Individual judge model IDs, versions, and generation settings were not captured in the task exports. |
| Deterministic evaluation | Thirteen exported-and-attached annotation fields | These checks use no judge model. |

## Preregistered plan

## Decision to make

Determine whether Prompt C improves customer outcome quality on the same grocery cases without creating an unacceptable latency, token, or tool-use regression.

## Baseline observation

Prompt B produced a useful failure trace: `8dda9755f410fbdb64660809779cd9fe`. The run was operationally successful but incomplete and partly irrelevant. It searched seven of 14 items, stopped at its round budget, used broad lexical matches for short terms, used restrictive phrases for descriptive terms, and reported unsearched items as unavailable.

That diagnostic trace used contract `0.1.0`. Before either experiment run, contract `0.2.0` made state classification deterministic: `unavailable` requires completed searches of both retailers; incomplete or failed searches return `review`. Both Prompt B and Prompt C used `0.2.0`, so this correction was a control, not a candidate benefit.

## Hypothesis

> A coverage-first search policy that queries both retailers efficiently, normalizes preparation language, rejects category-incompatible matches, and preserves unresolved state will improve task completion and evidence relevance without exceeding the accepted latency and token envelope.

## Independent variable

The only intended behavioral change is the versioned prompt and search policy:

- **Baseline:** Prompt B / `search-policy-v1`
- **Candidate:** Prompt C / versioned coverage-first search policy

Prompt C will add:

1. an explicit requested, searched, matched, and unresolved ledger;
2. one combined retailer query per item where the gateway permits it;
3. concept normalization that removes preparation language while retaining the original request;
4. product-category compatibility checks;
5. at most one materially different reformulation after weak or empty evidence;
6. an explicit unresolved-work ledger during search planning.

## Controls

The experiment will hold these factors constant:

| Control | Fixed value or rule |
| --- | --- |
| Evaluation cases | Same four trace-derived cases and dataset version |
| Model | Same model and generation configuration |
| Costco data | Same frozen D1 catalog version |
| Walmart data | Same frozen D1 catalog version |
| Agent contract | Contract `0.2.0` for both variants, including the shared state invariant |
| SQL authority | Same read-only policy gateway and execution limits |
| Runtime | Same Cloudflare Worker execution path |
| Evaluators | Same evaluator versions and scope |
| Manual review | Same rubric for evaluator disagreements |

Holding these factors constant isolates the prompt and search-policy change as the experimental variable.

## Dependent variables

### Customer-outcome measures

- completed item coverage;
- product relevance;
- recommendation grounding;
- task completion;
- truthful state classification;
- false confident recommendation count.

### Agent and operational measures

- end-to-end latency;
- prompt and completion tokens;
- model calls;
- tool calls;
- repeated or equivalent queries;
- retries and errors;
- stop reason;
- experiment-run completion rate.

## Evaluation methods

Use deterministic evaluators where the claim can be checked exactly:

- one final result for every requested item;
- source IDs exist in retrieved evidence;
- displayed prices match source evidence;
- no unsearched item is labeled unavailable;
- retailer coverage and duplicate-query rules;
- token, latency, call, retry, and stop measurements.

Use Arize-native model evaluators for judgments that require semantic interpretation:

- product relevance;
- groundedness or faithfulness;
- task completion;
- trajectory or step efficiency where the native template and available fields support the intended scope.

Manually inspect close variants and evaluator disagreements before making the release decision.

## Decision rule

Choose exactly one outcome after the experiment:

- **Ship:** quality improves across the critical cases, unsupported states are removed, and operational regressions remain inside the accepted envelope.
- **Revise:** the hypothesis is partially supported, but a quality or operational guardrail still fails.
- **Hold:** the candidate does not improve the target behavior or creates a less useful customer or operational outcome.

No outcome will be entered into the preregistered plan until it is verified in Arize or a trusted export; verified results remain in the linked Part 2 decision record.
