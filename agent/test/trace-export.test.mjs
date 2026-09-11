import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/arize-openinference.ts", import.meta.url), "utf8");
for (const expected of ["OTLPTraceExporter", "OpenInferenceSpanKind.AGENT", "OpenInferenceSpanKind.LLM", "OpenInferenceSpanKind.TOOL", "https://otlp.arize.com/v1/traces", "forceFlush", "arize-space-id", "arize-api-key"]) {
  assert.ok(source.includes(expected), `trace export is missing ${expected}`);
}
assert.ok(!/sk-[a-zA-Z0-9]/.test(source), "reference export must not contain an API key");
console.log("Trace-export wiring check passed.");
