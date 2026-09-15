import { AGENT_CONTRACT } from "./contract.ts";

const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|UPSERT|REPLACE|DROP|ALTER|CREATE|TRUNCATE|PRAGMA|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|LOAD_EXTENSION)\b/i;

export type SqlPolicyDecision = {
  allowed: boolean;
  reason: "allowed" | "empty" | "too_long" | "multiple_statements" | "comments_not_allowed" | "not_read_only" | "forbidden_operation" | "system_table_access";
  normalizedSql?: string;
};

/**
 * This is the demonstration gateway's safety policy. It is deliberately not a
 * SQL parser or a table/column allowlist. Invalid catalog SQL is allowed to
 * reach the database so the agent's search decisions can be observed.
 */
export function evaluateSqlPolicy(sql: string, maxLength = AGENT_CONTRACT.execution.maxSqlCharacters): SqlPolicyDecision {
  const trimmed = sql.trim();
  if (!trimmed) return { allowed: false, reason: "empty" };
  if (trimmed.length > maxLength) return { allowed: false, reason: "too_long" };
  if (!AGENT_CONTRACT.sql.commentsAllowed && /--|\/\*|\*\//.test(trimmed)) return { allowed: false, reason: "comments_not_allowed" };
  const normalizedSql = trimmed.endsWith(";") ? trimmed.slice(0, -1).trim() : trimmed;
  if (!AGENT_CONTRACT.sql.multipleStatementsAllowed && normalizedSql.includes(";")) return { allowed: false, reason: "multiple_statements" };
  const firstKeyword = normalizedSql.match(/^([A-Z]+)/i)?.[1]?.toUpperCase();
  if (!firstKeyword || !AGENT_CONTRACT.sql.allowedStatementPrefixes.includes(firstKeyword as "SELECT" | "WITH")) return { allowed: false, reason: "not_read_only" };
  if (!AGENT_CONTRACT.sql.mutationsAllowed && FORBIDDEN_SQL.test(normalizedSql)) return { allowed: false, reason: "forbidden_operation" };
  if (!AGENT_CONTRACT.sql.systemTablesAllowed && /\bsqlite_/i.test(normalizedSql)) return { allowed: false, reason: "system_table_access" };
  return { allowed: true, reason: "allowed", normalizedSql };
}

export type QueryExecutor = (sql: string) => Promise<Array<Record<string, unknown>>>;

export type SqlExecutionResult = {
  policy: SqlPolicyDecision;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  durationMs: number;
  error?: string;
};

/** Apply the hosted demo's row cap around a database adapter supplied by the caller. */
export async function executeCatalogSql(execute: QueryExecutor, sql: string, resultLimit: number = AGENT_CONTRACT.execution.defaultResultRows): Promise<SqlExecutionResult> {
  const started = Date.now();
  const policy = evaluateSqlPolicy(sql);
  if (!policy.allowed || !policy.normalizedSql) return { policy, rows: [], rowCount: 0, truncated: false, durationMs: Date.now() - started };
  const safeLimit = Math.max(1, Math.min(resultLimit, AGENT_CONTRACT.execution.maxResultRows));
  try {
    const rows = await execute(`SELECT * FROM (${policy.normalizedSql}) AS agent_query LIMIT ${safeLimit + 1}`);
    return {
      policy,
      rows: rows.slice(0, safeLimit),
      rowCount: Math.min(rows.length, safeLimit),
      truncated: rows.length > safeLimit,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return { policy, rows: [], rowCount: 0, truncated: false, durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
  }
}

export function inspectCatalogSchema(): Record<string, unknown> {
  return {
    dialect: "SQLite",
    tables: ["costco_products", "walmart_products"],
    requiredEvidenceColumns: ["source_row_id", "retailer", "product_name", "price_current", "match_strength"],
    note: "Prices and inventory are frozen demonstration data, not live retailer claims.",
  };
}
