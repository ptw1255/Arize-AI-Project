# AI coding-tool use

I used AI coding tools to accelerate implementation and documentation. They helped scaffold the Cloudflare Worker, generate repeatable data-preparation code, add trace attributes, write test harnesses, operate the Arize CLI, and organize the evidence in this repository.

I owned the product decisions:

- separating OCR from the agent boundary;
- allowing model-authored SQL while keeping server-side limits;
- defining the customer response states;
- selecting the four regression cases;
- writing the reference behavior before the comparison;
- pairing model judges with deterministic checks;
- keeping Prompt B as the deployed demo baseline while C was tested;
- choosing not to promote Prompt C after the experiment.

AI output required verification. Three examples changed the work:

1. Early plans included more infrastructure and data than the assignment needed. I reduced the scope to one user flow, two tools, one controlled dataset, and one prompt comparison.
2. Prompt C produced item IDs and retailer values that did not match the contract. I kept the runtime contract fixed and revised only the candidate prompt so the traces preserved that behavior.
3. Earlier documentation described a different OCR boundary than the hosted demo. The hosted demo sends photos to the Cloudflare Worker for model-based OCR. I corrected the shared write-up to match the system reviewers can run.

## Product feedback from the assisted workflow

The implementation work surfaced several product questions in the UI:

- a trace can be accepted before every expected span is queryable;
- evaluator mappings can appear plausible without proving that the selected field answers the evaluator's question;
- span-, trace-, and session-level evaluator scope becomes clear too late;
- provider throttling and context failures do not produce an obvious expected-versus-completed denominator;
- operational fields can exist in trace or experiment output without appearing in the comparison view.

These observations are recorded in the [opportunities-to-improve log](FRICTION_LOG.md). They led to the Evaluation Readiness Preflight proposal; the coding tool did not select or prioritize that investment.

I verified generated work with the repository test suite, trace inspection, Arize experiment exports, deterministic annotations, and manual comparison of evaluator disagreements. I did not use generated scores or model-generated or hand-reconstructed evidence screenshots.
