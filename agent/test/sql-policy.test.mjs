import assert from "node:assert/strict";
import { evaluateSqlPolicy } from "../src/sql-policy.ts";

for (const sql of [
  "SELECT source_row_id FROM costco_products",
  "WITH matches AS (SELECT * FROM walmart_products) SELECT * FROM matches;",
  "SELECT missing_column FROM unknown_catalog",
]) {
  assert.equal(evaluateSqlPolicy(sql).allowed, true, `expected policy to allow ${sql}`);
}

for (const [sql, reason] of [
  ["", "empty"],
  ["DELETE FROM costco_products", "not_read_only"],
  ["SELECT * FROM costco_products; DROP TABLE costco_products", "multiple_statements"],
  ["SELECT * FROM costco_products -- comment", "comments_not_allowed"],
  ["PRAGMA table_info(costco_products)", "not_read_only"],
  ["SELECT * FROM sqlite_master", "system_table_access"],
]) {
  const result = evaluateSqlPolicy(sql);
  assert.equal(result.allowed, false, `expected policy to reject ${sql}`);
  assert.equal(result.reason, reason);
}

console.log("SQL policy test passed.");
