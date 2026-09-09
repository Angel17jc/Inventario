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

// Un fallo pasajero de Supabase no es una deriva de los tipos. Se reintenta, y
// si aun así no responde se sale con 75 (EX_TEMPFAIL) para que quien llama
// pueda distinguir "no se pudo comprobar" de "los tipos no coinciden".
const NO_SE_PUDO_COMPROBAR = 75;
const INTENTOS = 3;

async function pedirTipos() {
  let ultimoFallo = "";
  for (let intento = 1; intento <= INTENTOS; intento += 1) {
    let respuesta;
    try {
      respuesta = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/types/typescript`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      ultimoFallo = `no se pudo conectar: ${error.message}`;
      await esperar(intento);
      continue;
    }

    if (respuesta.ok) return respuesta;

    const cuerpo = (await respuesta.text()).slice(0, 300);

    // 401 y 403 no mejoran esperando: o el token venció o le falta un permiso.
    // El cuerpo dice cuál, que es la pregunta que uno tiene aquí.
    if (respuesta.status === 401 || respuesta.status === 403) {
      console.error(`La API rechazó el token (${respuesta.status}): ${cuerpo}`);
      console.error("Si esto empezó de golpe, lo más probable es que el token haya vencido:");
      console.error("duran 90 días. Se renueva en Supabase → Account → Access Tokens y se");
      console.error("repone en GitHub → Settings → Secrets and variables → Actions.");
      return salir(1);
    }

    ultimoFallo = `la API respondió ${respuesta.status}: ${cuerpo}`;
    if (respuesta.status < 500) {
      console.error(`La API respondió ${respuesta.status}: ${cuerpo}`);
      return salir(1);
    }
    await esperar(intento);
  }

  console.error(`Supabase no respondió tras ${INTENTOS} intentos (${ultimoFallo}).`);
  console.error("No se comprueba nada esta vez; no significa que los tipos hayan cambiado.");
  return salir(NO_SE_PUDO_COMPROBAR);
}

/**
 * Marca el código de salida y deja que Node termine solo.
 *
 * `process.exit()` aquí aborta con una aserción de libuv en Windows, porque la
 * conexión de `fetch` sigue abierta: el proceso muere con 127 en vez de con el
 * código que se quería, y quien llama —el CI— toma una decisión equivocada a
 * partir de él.
 */
function salir(codigo) {
  process.exitCode = codigo;
  return null;
}

function esperar(intento) {
  return new Promise((listo) => setTimeout(listo, intento * 2000));
}

const respuesta = await pedirTipos();
if (respuesta === null) {
  // pedirTipos ya explicó por qué y dejó puesto el código de salida.
} else {
  const { types } = await respuesta.json();
  if (typeof types !== "string" || !types.includes("export type Database")) {
    console.error("La respuesta no trae los tipos esperados; no se escribe nada.");
    process.exitCode = 1;
  } else {
    writeFileSync(DESTINO, CABECERA + types.trimStart());
    console.log(`backend/database.types.ts regenerado (${types.split("\n").length} líneas del esquema).`);
  }
}

