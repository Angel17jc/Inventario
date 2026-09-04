/**
 * What may be written about a request.
 *
 * Response bodies were removed from the log long ago because they carried
 * customer names, balances and stock figures. The path can carry a name too:
 * /api/credits/customer/:customerName spells out who owes money, and a request
 * line is written on every call.
 *
 * Kept apart from app.ts so it can be tested without booting the server, which
 * validates its Supabase configuration while it loads.
 */

/** The request path with any customer name in it replaced by its parameter. */
export function withoutPersonalData(path: string): string {
  return path.replace(/^(\/api\/credits\/customer\/).+$/, "$1:customerName");
}
