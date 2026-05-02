/**
 * repositories/speedRepository.ts
 * All SQL for the speed_readings table lives here.
 *
 * Design note: Accepting an optional pool param makes every method testable
 * without module-level mocking.
 */

import { Pool } from 'pg';
import pool from '../db/pool';
import { SpeedReading } from '../types/index';

/**
 * Fetch the most recent N readings ordered newest-first.
 *
 * @param limit - Number of rows to return (default 60).
 * @param p - pg Pool to use (defaults to module singleton).
 * @returns Array of SpeedReading sorted by recorded_at DESC.
 */
export async function getRecent(limit = 60, p: Pool = pool): Promise<SpeedReading[]> {
  const result = await p.query<SpeedReading>(
    'SELECT id, speed_kmh, recorded_at, sensor_id FROM speed_readings ORDER BY recorded_at DESC LIMIT $1',
    [limit],
  );
  return result.rows;
}

/**
 * Fetch readings within a time range.
 *
 * @param from - Start of the range (inclusive).
 * @param to - End of the range (inclusive).
 * @param p - pg Pool to use (defaults to module singleton).
 * @returns Array of SpeedReading within [from, to].
 */
export async function getInRange(from: Date, to: Date, p: Pool = pool): Promise<SpeedReading[]> {
  const result = await p.query<SpeedReading>(
    'SELECT id, speed_kmh, recorded_at, sensor_id FROM speed_readings WHERE recorded_at BETWEEN $1 AND $2 ORDER BY recorded_at DESC',
    [from, to],
  );
  return result.rows;
}

/**
 * Insert a new speed reading.
 *
 * @param speed_kmh - Speed value (must satisfy CHECK 0–300).
 * @param sensor_id - Identifier for the sensor.
 * @param p - pg Pool to use (defaults to module singleton).
 * @returns The newly inserted SpeedReading.
 */
export async function insert(speed_kmh: number, sensor_id: string, p: Pool = pool): Promise<SpeedReading> {
  const result = await p.query<SpeedReading>(
    'INSERT INTO speed_readings (speed_kmh, sensor_id) VALUES ($1, $2) RETURNING id, speed_kmh, recorded_at, sensor_id',
    [speed_kmh, sensor_id],
  );
  return result.rows[0];
}

/**
 * Delete old readings, keeping only the most recent keepN rows.
 *
 * @param keepN - Number of rows to retain.
 * @param p - pg Pool to use (defaults to module singleton).
 */
export async function pruneOldReadings(keepN: number, p: Pool = pool): Promise<void> {
  await p.query('SELECT prune_old_readings($1)', [keepN]);
}
