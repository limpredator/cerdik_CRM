import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// .env lives at the monorepo root (one dir up from server/), shared with
// docker-compose — not server/.env, so dev/start/migrate/seed all read the
// exact same file regardless of which package's cwd they run from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Single-company-per-install for phase 1, but every row still carries
 * company_id — see docs/MQTT-API.md and the schema migrations for why. This
 * is the one row seeded into `companies` on first migration.
 */
export const config = {
  port: Number(process.env.PORT ?? 4100),
  jwtSecret: process.env.JWT_SECRET ?? '',
  companyName: process.env.COMPANY_NAME ?? 'Default Company',

  database: {
    url: process.env.DATABASE_URL ?? 'postgres://cerdik:cerdik@localhost:5432/cerdik_crm',
  },

  enquiries: {
    websiteWebhookSecret: process.env.WEBSITE_WEBHOOK_SECRET ?? '',
  },

  mqtt: {
    // Broker WE host — the PBX connects OUT to this (see docs/MQTT-API.md).
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://127.0.0.1:1883',
    username: process.env.MQTT_USERNAME ?? undefined,
    password: process.env.MQTT_PASSWORD ?? undefined,
    // The PBX's own serial — all its topics are rooted at
    // device/<serial>/api/v1.0/... Never hardcode this.
    deviceSerial: process.env.MQTT_DEVICE_SERIAL ?? '',
  },
};

export function assertConfigured(): void {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not set — see .env.example');
  }
}
