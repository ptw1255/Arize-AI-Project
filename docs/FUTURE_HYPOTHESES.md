# Future hypotheses

The Prompt B/C comparison answered one question: forcing complete search did not improve the customer result. The next work should test the evidence interface, search quality, efficiency, trace continuity, and evaluation setup separately.

## 1. Preserve retailer identity outside model-authored SQL

**Opportunity to improve:** Prompt C returned title-cased retailer values. SQL succeeded, but the evidence resolver could not connect the rows to the canonical retailer identity.

**Hypothesis:** If the tool gateway assigns retailer identity from the source table, valid catalog rows will remain usable while the remaining search-quality opportunities stay visible.

**Measure:** evidence-resolution mismatches, critical relevance, completed coverage, and contract pass rate.

**Decision:** Keep the change only if it removes identity mismatches without allowing rows from an unapproved source to enter the evidence map.

## 2. Evaluate candidates before recommendation

**Opportunity to improve:** Broad word matching returned chicken packed in water for water, celery salt for celery, and pot roast containing carrots for carrots.

**Hypothesis:** A category-compatibility check between retrieval and recommendation will reduce false strong matches while preserving valid grocery candidates.

**Measure:** critical relevance, false strong-match count, review rate, unresolved rate, and added latency.

**Decision:** Keep the check if relevance improves without converting a large share of valid products into review or unresolved states.

## 3. Separate coverage from search efficiency

**Opportunity to improve:** Prompt C reached 100% search coverage with 45.8% more tool calls, 93.9% more elapsed time, and 132.5% more completion tokens.

**Hypothesis:** A compact search plan can preserve full retailer coverage with fewer repeated instructions and fewer tool calls.

**Measure:** completed coverage, evidence gained per tool call, equivalent-query count, latency, model calls, tool calls, and tokens.

**Decision:** Keep the plan if it preserves relevance and coverage while reducing the operating cost measured in Prompt C.

## 4. Correlate two request traces across human review

**Opportunity to improve:** OCR and comparison are separate requests because human review is an asynchronous boundary. A hard timeout can still appear in Cloudflare logs without a complete Arize trace.

**Hypothesis:** Propagating one workflow and session identifier across both request traces, while exporting partial spans during execution, will reduce uncorrelated and unobserved attempts without inventing one continuous server span around human review.

**Measure:** percentage of customer attempts with a complete cross-system record, time to locate an incomplete attempt, and percentage of timed-out runs with partial trace evidence.

**Decision:** Keep the design if an operator can move from a customer attempt to OCR, application, model, tool, and outcome evidence without manual timestamp matching.

## 5. Add an Evaluation Readiness Preflight

**Opportunity to improve:** Field mapping, evaluator scope, context size, missing reference evidence, operational measures, and label coverage required manual inspection after task setup.

**Hypothesis:** A preflight will reduce incomplete evaluator calls and shorten the time from a trace-derived case to a trustworthy first comparison.

**Measure:** time to first valid score, mapping corrections after launch, evaluator completion rate, missing-label rate, and judge calls rerun.

**Decision:** Prioritize the feature if it catches the setup conditions observed in this project before the first judge call and does not add another manual configuration step.

## 6. Define agent service indicators, objectives, and escalation

**Opportunity to improve:** This project could show that a request completed, a trace was structurally healthy, and an agent answer was still unsupported. Arize can already visualize custom metrics, run continuous evaluations, monitor signals, and send alerts, but teams still need a shared definition of acceptable agent service across development and production.

**Hypothesis:** A versioned agent service-objective contract will help AI engineers, product managers, and SREs agree on outcome, reliability, efficiency, and governance thresholds before an agent is shared broadly or promoted to production.

**Measure:** percentage of production agents with an approved objective set, time from objective breach to the relevant trace cohort, percentage of release decisions using the same indicators as production monitoring, false escalation rate, and objective ownership coverage.

**Decision:** Continue past discovery only if design partners can define actionable thresholds, owners, and escalation responses without forcing unlike agent use cases into one universal score. Arize should produce evidence and notifications; application runtimes should retain enforcement authority.

## Recommended order

There are two different roadmaps in this project.

**For the grocery agent:**

1. Preserve retailer identity.
2. Add candidate relevance checks.
3. Reduce the cost of complete coverage.

**For Arize AX:**

1. Build and test Evaluation Readiness Preflight because it is supported directly by the completed dogfooding workflow.
2. Improve trace readiness and cross-request correlation as enabling observability work.
3. Run discovery on agent service objectives and escalation before treating them as a roadmap commitment.

The grocery-agent work improves the customer result. The Arize work improves the path from production evidence to a trusted change and, later, to a shared production operating contract.
