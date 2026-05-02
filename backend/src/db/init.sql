-- init.sql
-- Database schema, trigger, indexes, and pruning function for the speedometer app.
--
-- Design note: Uses IF NOT EXISTS on all DDL so this file is safe to re-run
-- on every fresh container start without errors.

CREATE TABLE IF NOT EXISTS speed_readings (
  id          BIGSERIAL PRIMARY KEY,
  speed_kmh   NUMERIC(6,2) NOT NULL CHECK (speed_kmh >= 0 AND speed_kmh <= 300),
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  sensor_id   VARCHAR(64)  NOT NULL DEFAULT 'sensor-1',
  metadata    JSONB        DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_speed_recorded_at ON speed_readings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_speed_sensor      ON speed_readings (sensor_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION notify_speed_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('speed_update', json_build_object(
    'id',         NEW.id,
    'speed_kmh',  NEW.speed_kmh,
    'recorded_at',NEW.recorded_at,
    'sensor_id',  NEW.sensor_id
  )::text);
  RETURN NEW;
END;
$$;

-- Drop trigger first so CREATE OR REPLACE on the function takes effect cleanly
DROP TRIGGER IF EXISTS trg_speed_notify ON speed_readings;

CREATE TRIGGER trg_speed_notify
  AFTER INSERT ON speed_readings
  FOR EACH ROW EXECUTE FUNCTION notify_speed_insert();

CREATE OR REPLACE FUNCTION prune_old_readings(keep_n INT DEFAULT 10000)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM speed_readings
  WHERE id NOT IN (
    SELECT id FROM speed_readings ORDER BY recorded_at DESC LIMIT keep_n
  );
END;
$$;
