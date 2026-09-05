/**
 * Regenerates backend/database.types.ts from the database itself.
 *
 *   npm run types:db
 *
 * Needs SUPABASE_ACCESS_TOKEN: a Supabase account token scoped to this project
 * with read on Database and on Project Settings, and nothing else. It must not
 * be able to read API keys — the service role key bypasses RLS, and this only
 * ever needs to look at the shape of the tables.
 *
 * It talks to the Management API rather than shelling out to the Supabase CLI.
 * The CLI calls this same endpoint, and pulling a 30 MB binary whose output
 * formatting can change between releases would turn a drift check into a
 * source of false alarms.
 */
import { writeFileSync } from "node:fs";

const PROJECT = process.env.SUPABASE_PROJECT_ID ?? "htkzkykfmnybkqcrtkby";
const DESTINO = new URL("../backend/database.types.ts", import.meta.url);

const CABECERA = `// Generado por \`npm run types:db\` desde el esquema real de Supabase.
// NO editar a mano: el paso "database types are current" del CI vuelve a
// generarlo y falla si este archivo no coincide con la base.
//
// El archivo que había antes en db.ts estaba escrito a mano y describía el
// esquema de enero. Por eso se genera.

`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN. Se crea en Supabase → Account → Access Tokens,");
  console.error("con alcance Project y solo lectura de Database y Project Settings.");
  process.exit(1);
}

const respuesta = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/types/typescript`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!respuesta.ok) {
  // El cuerpo dice qué permiso falta, que es la pregunta que uno tiene aquí.
  console.error(`La API respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`);
  process.exit(1);
}

const { types } = await respuesta.json();
if (typeof types !== "string" || !types.includes("export type Database")) {
  console.error("La respuesta no trae los tipos esperados; no se escribe nada.");
  process.exit(1);
}

writeFileSync(DESTINO, CABECERA + types.trimStart());
console.log(`backend/database.types.ts regenerado (${types.split("\n").length} líneas del esquema).`);
