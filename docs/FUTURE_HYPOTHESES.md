# Future hypotheses

The Prompt B/C comparison answered one question: forcing complete search did not improve the customer result. The next work should test the evidence interface, search quality, efficiency, trace continuity, and evaluation setup separately.

## 1. Preserve retailer identity outside model-authored SQL

**Opportunity to improve:** Prompt C returned title-cased retailer values. SQL succeeded, but the evidence resolver could not connect the rows to the canonical retailer identity.

**Hypothesis:** If the tool gateway assigns retailer identity from the source table, valid catalog rows will remain usable and search-quality gaps will remain visible.

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

## 4. Create one trace across OCR, review, and agent execution

**Opportunity to improve:** OCR and comparison are separate requests. A hard timeout can appear in Cloudflare logs without a complete Arize trace.

**Hypothesis:** Propagating one workflow ID from upload through comparison and exporting partial spans during execution will reduce uncorrelated and unobserved attempts.

**Measure:** percentage of customer attempts with a complete cross-system record, time to locate an incomplete attempt, and percentage of timed-out runs with partial trace evidence.

**Decision:** Keep the design if an operator can move from a customer attempt to OCR, application, model, tool, and outcome evidence without manual timestamp matching.

## 5. Add an Evaluation Readiness Preflight

**Opportunity to improve:** Field mapping, evaluator scope, context size, missing reference evidence, operational measures, and label coverage required manual inspection after task setup.

**Hypothesis:** A preflight will reduce incomplete evaluator calls and shorten the time from a trace-derived case to a trustworthy first comparison.

**Measure:** time to first valid score, mapping corrections after launch, evaluator completion rate, missing-label rate, and judge calls rerun.

**Decision:** Prioritize the feature if it catches the setup conditions observed in this project before the first judge call and does not add another manual configuration step.

## Recommended order

1. Preserve retailer identity.
2. Add candidate relevance checks.
3. Reduce the cost of complete coverage.
4. Improve trace continuity.
5. Validate evaluation readiness in the Arize workflow.

The first three hypotheses improve the customer result. The fourth improves incident evidence. The fifth reduces developer effort when converting that evidence into a release decision.
