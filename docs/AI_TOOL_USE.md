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
- rejecting Prompt C after the experiment.

AI output required verification. Three examples changed the work:

1. Early plans included more infrastructure and data than the assignment needed. I reduced the scope to one user flow, two tools, one controlled dataset, and one prompt comparison.
2. Prompt C produced invalid item IDs and then invalid retailer identity. I kept the runtime contract fixed and revised only the candidate prompt so the traces preserved those failures.
3. Earlier documentation described a different OCR boundary than the hosted demo. The hosted demo sends photos to the Cloudflare Worker for model-based OCR. I corrected the shared write-up to match the system reviewers can run.

I verified generated work with the repository test suite, trace inspection, Arize experiment exports, deterministic annotations, screenshot review, and manual comparison of evaluator disagreements. I did not use generated scores or reconstructed screenshots.
