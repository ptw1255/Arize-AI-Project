# Project brief — Grocery comparison agent

## Product

A customer uploads recipe or grocery-list photos, reviews the extracted items, and asks an agent to compare Costco and Walmart. The result shows an item-level retailer recommendation backed by product, package, price, and source evidence.

[Open the hosted demo](https://grocery.parkerwall-dev.workers.dev/)

The demo is access-controlled. Temporary reviewer credentials are supplied separately in the submission email and are not stored in this repository. See [reviewer access](REVIEWER_ACCESS.md).

The current deployed demo result is captured in [19-current-deployed-demo-result.jpg](../assets/screenshots/19-current-deployed-demo-result.jpg). It uses the app's built-in three-item demo list, so it demonstrates the reviewed-list-to-recommendation flow but does not represent a photo-upload or OCR run.

The separate [reviewed OCR capture](../assets/screenshots/02-reviewed-ocr-list.jpg) comes from a real hosted-app upload of `demo1.PNG`. It shows the eight extracted items and edit controls before the agent comparison ran.

## Customer opportunity

A Costco member does not want every item in bulk. A price-sensitive shopper cannot safely compare non-equivalent packages or different currencies by sticker price alone. The deployed demo compares snapshot prices only after a conservative package-equivalence and currency check; it marks other package states for review and does not estimate a general unit price. The customer needs a split basket:

- buy this item at Costco;
- buy this item at Walmart;
- review this match;
- leave this item unresolved when the evidence is incomplete.

The product must explain each decision with the evidence the agent actually found.

## Why I chose this use case

The task is familiar to a customer and difficult for an agent in useful ways. Product names are inconsistent. Package sizes differ. Short words create false matches. Some valid items are absent. The agent must search, interpret, recover, stop, and express uncertainty.

That behavior creates observable questions:

- Did the agent search both retailers?
- Did it choose the correct product category?
- Did it repeat work?
- Did it stop because the task was complete or because it ran out of budget?
- Can every recommendation be traced to returned evidence?
- Did a quality gain increase latency, tokens, or tool calls?

## Service architecture

![Grocery comparison agent system architecture](../assets/architecture/grocery-agent-system.svg)

The hosted demo sends selected photos to Worker model OCR. OCR ends when the customer approves the returned list; the agent then owns catalog search and comparison. OCR and recommendation remain separate request traces because customer review sits between them. A shared workflow identifier connects the requests without presenting review time as one continuous server span.

The application records bounded request metrics and structured events for upload, OCR, agent invocation, validation, and response delivery. Cloudflare Logs provides the runtime operating view; the demonstration also persists an allowlisted application projection in D1 so it can be joined to exact Arize traces. The Worker exports application roots and agent, model, tool, and validation spans through OpenTelemetry, OTLP, and OpenInference conventions.

## Why I designed the agent this way

The agent receives a reviewed grocery list and shopper preferences. It can inspect the available catalog schema and write read-only SQL. It uses the returned rows to compare relevant products, package sizes, and snapshot prices. The server only treats raw snapshot prices as comparable when it can establish package equivalence conservatively; it returns a machine-readable non-comparability state and asks for review otherwise.

I kept query formation inside the agent boundary. A fixed search function would have hidden search quality in application code. Model-authored SQL made query choice, schema interpretation, candidate selection, retries, and stopping behavior visible in the trace.

The agent was intentionally allowed to be imperfect. It could write ineffective SQL, choose irrelevant rows, repeat a rejected tool call, or stop before it completed the list. Those behaviors created evidence for the observability and evaluation workflows.

The application controls the consequence of those mistakes. The model cannot mutate the catalogs, change its limits, or create the final response from unverified evidence.

[Read the agent definition](AGENT_DEFINITION.md)

## Data boundary

The Costco and Walmart catalogs are frozen snapshots. Licensed Kaggle rows provide source coverage. Labeled synthetic records add grocery categories, package variants, price differences, ambiguous names, and distractors needed for controlled tests.

The demonstration does not claim live price, promotion, inventory, or local-store availability. Synthetic records remain marked as synthetic.

## Observability model

I used OpenTelemetry for request and span structure and OpenInference for agent, model, and tool semantics. Shared workflow, request, run, trace, span, version, and environment fields connect the customer result to application and Arize evidence.

| Layer | Question | Evidence in this project |
| --- | --- | --- |
| Customer outcome | Did the shopper receive a complete and supported recommendation? | Task outcome, unresolved items, evidence strength, review state, critical relevance, and package comparability |
| Agent and model | What path did the agent take, and where did it lose evidence or budget? | Agent, LLM, SQL tool, validation, token, retry, stop-reason, and evaluator attributes in Arize |
| Application | Did OCR, request handling, validation, and response delivery work? | Request roots, status, duration, errors, route, response handling, and structured application events |
| Platform | Where was the request served, and which dependency performed the work? | Cloudflare serving colo, D1 activity, and model and tool latency |

The application layer establishes whether the service ran. Arize explains the agent trajectory and the evidence behind the result. Evaluation then tests whether a proposed change improves the customer outcome within the operating envelope. A successful request or span does not prove that the recommendation was complete or correct.

The [verified evidence dashboard](OBSERVABILITY_DASHBOARD.md) makes this boundary concrete for one live OCR-to-agent workflow. It joins two application requests to two exact Arize traces and reports 27 complete spans, four model calls, 17 SQL-tool calls, 59,904 tokens, 31.073 seconds of recorded server time, two D1 request metrics, 26 application events, and the Cloudflare `ATL` serving colo. The execution had zero trace errors and complete parentage, yet the agent outcome was `review_required`. That is the central operating distinction: healthy execution is necessary, but it does not establish customer success.

## Who needs this evidence

| Persona | Job to be done | Consequence of a weak evidence handoff |
| --- | --- | --- |
| AI engineer | Determine whether the prompt, tool, catalog data, or evidence contract caused the outcome, then create a reproducible test. | A plausible model answer can hide a retrieval or contract failure, and the next change targets the wrong layer. |
| Product manager | Decide whether a candidate improves customer quality within the accepted latency, cost, reliability, and governance envelope. | A quality aggregate or green runtime state can support a release even when key evaluations are missing or customer evidence regressed. |
| SRE | Move from a slow, failed, or incomplete customer request to the exact application request and agent trajectory. | The operator must correlate timestamps across platforms and may miss pre-model failures, partial traces, or the actual dominant latency layer. |

These consequences support the same product proposal; they are not three separate roadmap requests. Evaluation Readiness Preflight is the first investment because the AI engineer's trace-to-experiment handoff supplies the evidence the product manager and SRE later depend on.

The baseline trace changed the runtime contract: an item cannot be labeled `unavailable` until the required retailer searches are complete. The subsequent Prompt B/C experiment did not yield a better prompt. It prevented Prompt C from shipping after the candidate increased coverage but reduced critical relevance and increased time, tool calls, and completion tokens. That result shifted the next test from adding prompt instructions to strengthening the tool and evidence interface.

## Part 1 result

The baseline trace completed 25 spans with `OK` status. The customer result was incomplete and partly irrelevant.

- Seven of 14 items were fully searched.
- The agent stopped at its model-round limit.
- Water matched canned chicken “in Water.”
- Celery matched celery salt.
- Carrots matched a prepared meal containing carrots.
- Seven unsearched items were described as unavailable.

Part 1 converted those outcome gaps into four regression cases and a controlled hypothesis.

The diagnostic trace used contract `0.1.0`. Contract `0.2.0` then required completed searches of both retailers before an item could be called unavailable. I applied `0.2.0` to both experiment variants, so the correction was a shared control.

[Read Part 1](PART_1_BUILD_OBSERVE_DIAGNOSE.md)

## Part 2 result

I compared Prompt B with a coverage-first Prompt C on the same four cases under contract `0.2.0`.

| Outcome | Prompt B | Prompt C |
| --- | ---: | ---: |
| Completed item searches | 10/17 | 17/17 |
| Critical relevance pass | 3/4 | 0/4 |
| Total elapsed time | 45.188 s | 87.625 s |
| Tool calls | 24 | 35 |
| Completion tokens | 4,033 | 9,376 |

Prompt C completed more work and produced worse evidence at a higher operating cost. I rejected it and kept Prompt B as the deployed demo baseline.

[Read Part 2](PART_2_EVALUATE_IMPROVE_DECIDE.md) or [inspect the scrubbed run evidence](../evidence/experiment-runs.json).

## Evaluation approach

I paired Arize-native model evaluators with deterministic checks.

Native evaluators judged relevance, task completion, grounding, SQL generation, tool use, and step efficiency. Deterministic checks verified item coverage, source identity, supported state, known relevance collisions, latency, tokens, calls, retries, and errors.

The two methods disagreed on several Prompt C runs. Model judges approved coherent unavailable answers. Deterministic checks showed that relevant products existed and the agent did not return usable evidence. That disagreement changed the release decision.

## Product recommendation

I would add an **Evaluation Readiness Preflight** between a trace-derived dataset and the first experiment.

![Proposed Evaluation Readiness Preflight flow](../assets/product/evaluation-readiness-preflight.svg)

The visual separates the current trace-to-dataset and experiment path from the proposed validation layer. A developer confirms the launch. Automated content and prompt changes are excluded.

It would confirm:

- which fields represent task input, output, reference evidence, and tool trajectory;
- whether selected evaluators use compatible scopes;
- whether the mapped content fits the evaluator context window;
- which operational measures will appear in the comparison;
- how many labels are expected, completed, failed, or missing;
- which prompt, policy, model, dataset, and environment versions produced each run.

The proposal comes from setup steps and experiment results that produced incomplete or ambiguous evidence. It extends Arize's existing trace, dataset, evaluator, and experiment workflows.

I would deliver it in three product increments: expose dataset rows beside evaluator requirements, validate confirmed mappings and scope before judge calls, then carry the approved setup into an experiment stub. Candidate mappings would remain visibly inferred until the developer confirms them. That distinction matters because a plausible field match can produce a confident score for the wrong question.

The first pilot would cover trace-derived datasets in one Arize space, one dataset version, and one evaluator set per preflight. It would reuse the current trace-to-dataset, evaluator, experiment, and lineage components. It would require machine-readable evaluator inputs and scope, stable dataset-version schemas with sample values, and visibility into available operational measures.

The pilot would exclude automatic prompt rewriting, expected-answer generation, dataset mutation, and automatic remediation. I would judge it on median time from **Add to Dataset** to first trusted score and the rate of mapping corrections after the first scored run. A trusted score requires confirmed mappings, the expected evaluator labels, and no unresolved blocking condition.

## Future hypotheses

The next work should isolate five questions:

1. Can the tool gateway preserve retailer identity without trusting model-authored values?
2. Can a category-compatibility check remove lexical collisions before recommendation?
3. Can a compact search plan preserve coverage with fewer tool calls, tokens, and seconds?
4. Can one workflow ID connect OCR, application logs, agent traces, and timed-out runs?
5. Can an evaluation preflight catch mapping, scope, context, and missing-score conditions before judge calls begin?

[Read the future experiment backlog](FUTURE_HYPOTHESES.md)

## Submission evidence

- [Screenshot index](EVIDENCE_INDEX.md)
- [Assignment mapping](ASSIGNMENT_MAPPING.md)
- [Experiment design](EXPERIMENT_DESIGN.md)
- [Opportunities to improve](FRICTION_LOG.md)
- [Data and evidence boundaries](DATA_AND_EVIDENCE.md)
- [Product point of view](PRODUCT_POINT_OF_VIEW.md)
- [End-to-end evidence dashboard](OBSERVABILITY_DASHBOARD.md)
- [AI coding-tool use](AI_TOOL_USE.md)
- [Agent definition](AGENT_DEFINITION.md)
- [Future hypotheses](FUTURE_HYPOTHESES.md)
