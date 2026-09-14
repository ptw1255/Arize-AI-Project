# Assignment mapping

This table maps the requested take-home outcomes to the evidence in this repository.

| Assignment requirement | Evidence | State |
| --- | --- | --- |
| Build a simple agent | Hosted demo, [service architecture](PROJECT_BRIEF.md), and [agent definition](AGENT_DEFINITION.md) | Demonstrated |
| Explain the use case | Customer-decision framing and data boundary in Part 1 | Documented |
| Set up observability | Arize trace tree, OpenTelemetry/OpenInference explanation, and [verified end-to-end dashboard](OBSERVABILITY_DASHBOARD.md) | Demonstrated |
| Inspect failures, retries, latency, tokens, and trajectory | [Baseline trace diagnosis](PART_1_BUILD_OBSERVE_DIAGNOSE.md) plus the dashboard's exact traces, D1 metrics, logs, and serving colo | Demonstrated |
| Upload a dataset | Four observed trace-derived regression examples with reference behavior | Complete |
| Run a prompt or model experiment | Prompt B versus Prompt C on the same cases | Complete |
| Set up evals on the experiment | Deterministic annotations and 11 Arize-native templates | Complete, with explicit missing-label counts |
| Report before-and-after outcomes | [Verified comparison and release decision](PART_2_EVALUATE_IMPROVE_DECIDE.md) | Complete |
| Identify specific product friction | [Evidence-linked friction log](FRICTION_LOG.md), including trace readiness and experiment setup | Complete through Part 2 |
| Propose an adoption investment | [Evaluation Readiness Preflight](PRODUCT_POINT_OF_VIEW.md) | Final recommendation |
| Explain AI coding-tool use | [Tool-use and verification disclosure](AI_TOOL_USE.md) | Complete |

Part 1 satisfies the build and observability portions and defines the development experiment. Part 2 completes the development workflow, release decision, and product proposal.
