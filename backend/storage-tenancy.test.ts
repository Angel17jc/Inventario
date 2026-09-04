import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

/**
 * The isolation between shops lives in a filter someone has to remember to
 * write.
 *
 * The composite foreign keys stop a row of one shop from pointing at a row of
 * another, and RLS is on. Neither helps here: the API reads with the service
 * key, which is exactly the role RLS is written to let through, so what keeps
 * one licorería's products out of another's screen is `organization_id` on
 * every query in this file. The generated Database type does not describe the
 * column, so the compiler cannot ask for it — and `(supabase as any)` is how
 * most of these queries are written.
 *
 * So it is checked here instead. Reading the source is crude, and it is the
 * same crude check the CI already runs on extensionless ESM imports: it costs
 * nothing and it catches the one mistake nobody notices until a shopkeeper is
 * looking at somebody else's stock.
 */

const TENANT_TABLES = [
  "categories",
  "suppliers",
  "products",
  "product_packs",
  "movements",
  "credit_accounts",
  "credit_payments",
];

const source = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
const lines = source.split("\n");

/**
 * The one statement starting at this line.
 *
 * A fixed number of lines does not work: a query that lost its filter would
 * borrow the one belonging to the method underneath it, and the check would
 * pass over a real hole. So the statement is closed where it actually ends —
 * at its semicolon, or as soon as the next one begins.
 */
function statementAt(start: number): string {
  const collected: string[] = [lines[start]];
  if (lines[start].trimEnd().endsWith(";")) return collected[0];

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    // The next statement has begun; this one had no filter of its own.
    if (/^\s*(const|let|return|async|await|if|for|\})/.test(line)) break;
    if (/\.(from|rpc)\(/.test(line)) break;
    collected.push(line);
    if (line.trimEnd().endsWith(";")) break;
  }
  return collected.join("\n");
}

test("every query in storage.ts is scoped to one organization", () => {
  const offenders: string[] = [];

  lines.forEach((line, index) => {
    const table = TENANT_TABLES.find(
      (name) => line.includes(`from('${name}')`) || line.includes(`from("${name}")`),
    );
    if (!table) return;

    // A chained query keeps going over the following lines, so the filter is
    // looked for across the whole statement rather than on this line alone.
    const statement = statementAt(index);
    if (!statement.includes("organization_id")) {
      offenders.push(`${table} · storage.ts:${index + 1}`);
    }
  });

  assert.deepEqual(
    offenders,
    [],
    `Consultas sin filtro de organización:\n  ${offenders.join("\n  ")}`,
  );
});

test("every stored procedure call carries the organization", () => {
  const offenders: string[] = [];

  lines.forEach((line, index) => {
    if (!line.includes(".rpc(")) return;
    const statement = statementAt(index);
    if (!statement.includes("p_organization_id")) {
      offenders.push(`storage.ts:${index + 1}`);
    }
  });

  assert.deepEqual(
    offenders,
    [],
    `Llamadas RPC sin p_organization_id:\n  ${offenders.join("\n  ")}`,
  );
});

test("the guard would notice a query that lost its filter", () => {
  // Without this, a rename that stopped the scan from matching anything would
  // leave the two tests above passing over nothing at all.
  const scanned = lines.filter((line) =>
    TENANT_TABLES.some((name) => line.includes(`from('${name}')`) || line.includes(`from("${name}")`)),
  );
  assert.ok(scanned.length >= 20, `Solo se revisaron ${scanned.length} consultas: el escaneo dejó de encontrarlas`);
});
