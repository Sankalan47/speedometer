/**
 * simulator.ts
 * Standalone sensor simulator process — inserts realistic speed readings.
 *
 * Design note: The state machine (IDLE → ACCELERATING → CRUISING → BRAKING)
 * produces naturalistic speed profiles instead of random noise, which makes
 * the frontend gauge visually compelling.
 */

import 'dotenv/config';
import { insert } from './repositories/speedRepository';
import { SimulatorState } from './types/index';

const SENSOR_INTERVAL_MS = parseInt(process.env.SENSOR_INTERVAL_MS ?? '1000', 10);
const SENSOR_ID = process.env.SENSOR_ID ?? 'sensor-1';

/** Returns a random integer in [min, max]. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clamp value to [0, 300] before every INSERT to avoid CHECK constraint violations. */
function clamp(val: number): number {
  return Math.max(0, Math.min(300, val));
}

let state: SimulatorState = 'IDLE';
let speed = 0;
let targetSpeed = 0;
let ticksRemaining = 0;

function nextTick(): void {
  switch (state) {
    case 'IDLE':
      speed = 0;
      if (ticksRemaining <= 0) {
        ticksRemaining = randInt(3, 5);
      }
      ticksRemaining--;
      if (ticksRemaining <= 0) {
        targetSpeed = randInt(60, 180);
        state = 'ACCELERATING';
      }
      break;

    case 'ACCELERATING':
      speed += randInt(5, 15);
      speed = clamp(speed);
      if (speed >= targetSpeed) {
        ticksRemaining = randInt(10, 20);
        state = 'CRUISING';
      }
      break;

    case 'CRUISING':
      speed += randInt(-3, 3);
      speed = clamp(speed);
      ticksRemaining--;
      if (ticksRemaining <= 0) {
        state = 'BRAKING';
      }
      break;

    case 'BRAKING':
      speed -= randInt(8, 20);
      speed = clamp(speed);
      if (speed <= 5) {
        speed = 0;
        ticksRemaining = 0;
        state = 'IDLE';
      }
      break;
  }
}

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
let retryAttempt = 0;

async function tick(): Promise<void> {
  nextTick();
  try {
    await insert(speed, SENSOR_ID);
    retryAttempt = 0;
    console.log(`[simulator] speed=${speed.toFixed(1)} km/h state=${state}`);
  } catch (err) {
    const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)];
    retryAttempt++;
    console.error(
      `[simulator] Insert failed (attempt ${retryAttempt}), retrying in ${delay}ms:`,
      (err as Error).message,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

console.log(`[simulator] Starting — interval=${SENSOR_INTERVAL_MS}ms sensor=${SENSOR_ID}`);
setInterval(() => { void tick(); }, SENSOR_INTERVAL_MS);
