# Product point of view

## Adoption opportunity

Arize already lets a developer inspect traces, add selected spans to a dataset, configure evaluators, and start experiments. The remaining opportunity is semantic readiness: a trace-derived example may contain data without containing the right, separable fields for the selected task and evaluators.

In this project, the dataset existed, but the task input was not named `question`, imported fields were nested, reference evidence was absent, evaluator scopes differed, and operational measures did not automatically appear in the experiment comparison. Each issue was discoverable, but only after moving deeper into the workflow.

![Trace-derived dataset with four cases](../assets/screenshots/11-trace-derived-dataset.jpg)

The screenshot also shows why the proposal is narrower than “trace to evaluation.” The trace-to-dataset action already works. The readiness gap appears after conversion: token and cost summaries are blank, while the row contract and evaluator mappings still require inspection.

## Proposed investment: Evaluation Readiness Preflight

Insert a preflight between **Add to Dataset** and the first scored experiment.

![Proposed Evaluation Readiness Preflight flow](../assets/product/evaluation-readiness-preflight.svg)

The blue steps are the proposed addition. The green steps are existing trace, dataset, and experiment capabilities. A developer confirms the mappings and chooses whether to launch; the preflight does not rewrite prompts or create expected answers.

The preflight would:

1. preview the actual dataset-row contract;
2. identify candidate task input, prior output, retrieved evidence, reference answer, and trajectory fields;
3. validate each evaluator's required variables and span, trace, or session scope;
4. flag missing or semantically overlapping mappings;
5. show prompt, policy, model, dataset, and environment lineage;
6. state which latency, token, cost, call, retry, and stop measures will be available for comparison;
7. generate a runnable experiment stub from the confirmed mappings.

## Why this first

The opportunity sits on the critical path from production evidence to a trustworthy improvement decision. An incorrect mapping can return a confident evaluation score for the wrong question. Builders configuring tasks, operators investigating incomplete runs, and product owners deciding whether to ship a change all depend on this handoff.

## MVP

The MVP is a read-only preview and validation step for one trace-derived dataset version and one evaluator set. It does not need to redesign datasets, evaluators, or experiments. It needs to show:

- the first three example shapes and representative values;
- the proposed task input and output mappings;
- pass, warning, or blocked status for every evaluator;
- incompatible evaluator scopes;
- missing reference or evidence fields;
- version lineage and available operational measures;
- a confirmed handoff to Prompt Playground, Agent Playground, or code.

## Product-level delivery sequence

This proposal reuses Arize's current trace viewer, trace-to-dataset action, dataset versions, evaluator definitions, experiments, and lineage metadata. The new work is a readiness check at the handoff between those components.

1. **Expose the contract.** Show representative rows from the selected dataset version beside the required variables and scope for each evaluator. Mark candidate mappings as inferred until the developer confirms them. An inferred match is a setup aid, not proof that the field carries the intended meaning.
2. **Validate before spend.** Return pass, warning, or blocked status for the confirmed mappings, evaluator scopes, context size, lineage fields, and available operational measures. A blocked state prevents the first scored run; warnings remain visible in the experiment record.
3. **Hand off the confirmed setup.** Create an experiment stub that carries the approved mappings and version lineage into Prompt Playground, Agent Playground, or code. The developer still owns the task implementation, references, and launch decision.

The first release depends on machine-readable evaluator variables and scope, a stable dataset-version schema with sample values, prompt and model lineage, and a reliable declaration of which operational measures are present. Ambiguous field names are the main product risk. A plausible inferred mapping can produce a valid-looking score against the wrong input, which is worse than a visible setup failure. The preflight should display the evidence behind each inference and require confirmation when more than one field could satisfy a variable.

The MVP excludes automatic prompt rewriting, expected-answer generation, dataset mutation, evaluator redesign, and automatic remediation. Those actions require separate evidence and user control.

## Limited pilot

Start with developers creating experiments from trace-derived datasets in one Arize space. Limit the pilot to one dataset version and one evaluator set per preflight. Compare the existing workflow with the preflight workflow using the same entry point: **Add to Dataset**.

The pilot should record:

- median time from **Add to Dataset** to the first trusted score;
- percentage of first experiments that produce the expected evaluator labels;
- percentage of mappings changed after the first scored run;
- blocked runs by reason, including missing variables, ambiguous mappings, incompatible scope, and context limits;
- developer confirmation that the scored comparison answered the intended product question.

For the pilot, a trusted score means that the developer confirmed the mappings, the run produced its expected labels, and no blocking readiness condition remained. A falling time-to-first-trusted-score with a low post-launch correction rate would support broader rollout. Faster execution paired with frequent mapping corrections would signal false confidence.

## Success measures

- median time from **Add to Dataset** to first trusted score;
- percentage of scored experiments whose mappings are corrected after launch;
- percentage of trace-derived datasets that reach a trusted first experiment;
- percentage of invalid evaluator mappings caught before judge calls begin;
- developer confirmation that the comparison answers the intended product question.

## Evidence from Part 2

Prompt B and Prompt C ran against the same four cases, catalog versions, runtime, contract, model configuration, and evaluator versions. Prompt C improved native task completion from 75% to 100%, but critical product relevance fell from three of four cases to zero, total elapsed time increased 93.9%, tool calls increased 45.8%, and completion tokens increased 132.5%.

The evaluation workflow also produced 37 of 44 expected native labels for B and 36 of 44 for C. Provider throttling, a context-window failure, evaluator-scope separation, and all-or-nothing override retry complicated the first trusted comparison. Native evaluators sometimes approved evidence-free abstentions that deterministic evidence checks rejected.

These observations make the preflight the recommended adoption investment. It acts before the developer spends judge calls or interprets an incomplete comparison, and it extends the existing trace-to-dataset and experiment workflows.
