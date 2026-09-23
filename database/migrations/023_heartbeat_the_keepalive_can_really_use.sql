-- Un latido que Supabase sí cuente como actividad.
--
-- El keepalive consultaba organizations con la clave publicable y recibía
-- 42501, permiso denegado. Lo daba por bueno con este razonamiento: "Postgres
-- rechazó la consulta, luego la ejecutó, luego el proyecto está activo". Era
-- falso. Supabase no contó esas peticiones rechazadas como actividad: el
-- keepalive marcó éxito siete días seguidos, del 9 al 15 de septiembre de 2026,
-- y el 16 —siete días exactos después del último uso real— el proyecto quedó
-- en pausa. Desde entonces el dominio ni siquiera resolvía.
--
-- La corrección es no discutir con la heurística de Supabase: hacer una
-- escritura real, que termine en 200, una vez al día.
--
-- Diseño:
--   - Una tabla de una sola fila. Nadie la lee ni la escribe directamente: RLS
--     activo, sin políticas, sin privilegios para anon ni authenticated.
--   - Una función SECURITY DEFINER que actualiza esa fila y devuelve la hora.
--     Es lo único que se concede a anon, y a propósito: es la excepción a la
--     regla de que ninguna función es ejecutable fuera del servidor. No toca
--     ningún dato de ninguna licorería y no devuelve nada salvo un instante.
--   - De paso deja constancia: last_beat dice cuándo fue el último latido, que
--     es la pregunta que hubo que contestar hoy a ciegas.

CREATE TABLE IF NOT EXISTS heartbeat (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_beat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  beats BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT heartbeat_single_row CHECK (id = 1)
);

INSERT INTO heartbeat (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE heartbeat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON heartbeat FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION heartbeat_beat()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  instante TIMESTAMPTZ;
BEGIN
  UPDATE heartbeat
  SET last_beat = NOW(), beats = beats + 1
  WHERE id = 1
  RETURNING last_beat INTO instante;
  RETURN instante;
END;
$BODY$;

REVOKE ALL ON FUNCTION heartbeat_beat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION heartbeat_beat() TO anon, service_role;

COMMENT ON TABLE heartbeat IS
  'Una fila. La actualiza el keepalive a diario para que Supabase no pause el proyecto. last_beat: último latido.';
COMMENT ON FUNCTION heartbeat_beat IS
  'Escritura real para el keepalive. Única función ejecutable por anon: no toca datos de ninguna licorería.';
