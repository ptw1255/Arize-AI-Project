# AI coding-tool use

I used AI coding tools as implementation support. I defined the use case, agent boundary, experiment question, controls, evaluation strategy, release criteria, and product recommendation. The tools helped translate those decisions into Cloudflare Worker code, repeatable data-preparation scripts, trace attributes, test harnesses, reviewed Arize CLI operations, and draft documentation.

I inspected the hosted workflow, traces, evaluator behavior, experiment exports, screenshots, and final claims before including them here. I retained ownership of the product framing, evidence interpretation, and release decision.

My decisions included:

- separating OCR from the agent boundary;
- allowing model-authored SQL while keeping server-side limits;
- defining the customer response states;
- selecting the four regression cases;
- writing the reference behavior before the comparison;
- pairing model judges with deterministic checks;
- keeping Prompt B as the deployed demo baseline while C was tested;
- choosing not to promote Prompt C after the experiment.

## How I verified assisted work

I verified the generated implementation through observable system behavior:

1. I ran the agent test suite to confirm SQL policy, evidence validation, package comparison, model-tool behavior, and trace-export wiring.
2. I exercised the hosted photo, OCR, review, and recommendation flow and matched application events to the expected Arize traces using workflow and trace identifiers.
3. I exported both experiment variants, reconciled all eight runs, checked the expected evaluator denominator, and compared semantic labels with deterministic evidence checks before making the release decision.

## Product opportunities to validate

The workflow produced five hypotheses that should be tested with developers before prioritization:

- **Trace readiness:** Test whether an explicit indexing or complete state helps developers avoid selecting partial traces for diagnosis and evaluation. Measure time to a reliable trace and the rate of evaluations started before every expected span is available.
- **Mapping confidence:** Test whether showing representative values and the reason behind an inferred evaluator mapping improves mapping accuracy. Measure corrections made after the first scored run and whether the evaluator answered the intended question.
- **Evaluator scope:** Test whether earlier guidance on span, trace, and session compatibility reduces task rebuilds. Measure configuration attempts, time to a valid task, and scope-related execution errors.
- **Evaluation coverage:** Test whether an expected, completed, failed, and missing score denominator improves confidence in experiment comparisons. Measure unnecessary reruns, judge-call spend, and release decisions made with incomplete labels.
- **Operational comparison:** Test whether carrying latency, token, cost, call, retry, and error measures into the comparison view changes release decisions. Measure how often teams inspect separate exports and whether quality improvements are evaluated against operating guardrails.

Each hypothesis is linked to observed evidence in the [opportunities-to-improve log](FRICTION_LOG.md). I used that evidence to scope the Evaluation Readiness Preflight; each item remains a discovery question until it is validated with users.

All reported scores come from Arize task exports or deterministic checks applied to the experiment runs. The evidence screenshots show the product UI and were not generated or reconstructed.
