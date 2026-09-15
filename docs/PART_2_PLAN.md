# Part 2: Execution record

Part 2 preserved Prompt B as the deployed demo baseline and implemented Prompt C as a separately versioned candidate. The completed result and release decision are documented in [Part 2: Evaluate, improve, and decide](PART_2_EVALUATE_IMPROVE_DECIDE.md).

## Work sequence

1. Completed expected behavior and reference evidence for all four trace-derived examples.
2. Implemented Prompt C without changing Prompt B.
3. Added a guarded experiment route that accepts only B or C.
4. Validated the nested dataset-row contract before running the model.
5. Ran both variants with the same model, catalogs, gateway, contract, and dataset version.
6. Attached deterministic annotations and ran the same Arize-native evaluator suite.
7. Inspected provider failures and semantic-versus-deterministic disagreements.
8. Exported and verified customer and operational measures.
9. Chose not to promote Prompt C v2.2 and retained Prompt B.
10. Finalized the product recommendation from the observed workflow friction.

## Product proposal candidate

The final proposal is an **Evaluation Readiness Preflight** between trace-to-dataset conversion and the first experiment run. It extends existing mappings and previews into a decision-level check covering target outcome, release guardrails, score coverage, operational measures, and lineage. The evidence and MVP are documented in [Product point of view](PRODUCT_POINT_OF_VIEW.md).

Arize already provides trace evaluation, Add to Dataset, native evaluators, and several experiment paths. The proposed preflight would help a developer verify that a trace-derived example contains the input, prior output, reference evidence, trajectory, version lineage, evaluator mappings, and operational measures required for a trustworthy first scored run.

Part 2 strengthened the proposal. Native evaluation produced useful evidence, but the comparison still required extra work: operating measures did not populate in the comparison table, evaluator scope and context constraints surfaced only after task creation, and retry behavior reran successful judge calls. The preflight addresses the earliest shared opportunity without duplicating Arize's existing trace-to-dataset action.
