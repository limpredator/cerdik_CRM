import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { config, assertConfigured } from './config';
import { pool } from './db/pool';
import { CdMqttConnector } from './connectors/cd-mqtt-connector';
import { LocalAuthProvider } from './auth/local-auth-provider';
import { WsHub } from './ws/hub';
import { startCallIngest } from './calls/call-ingest';
import { authRouter } from './routes/auth';
import { contactsRouter } from './routes/contacts';
import { callsRouter } from './routes/calls';
import { extensionsRouter } from './routes/extensions';

async function main(): Promise<void> {
  assertConfigured();

  const { rows } = await pool.query<{ id: string }>('SELECT id FROM companies LIMIT 1');
  const companyId = rows[0]?.id;
  if (!companyId) {
    throw new Error('No company row found — run `npm run migrate -w server` and seed one company first.');
  }

  const connector = new CdMqttConnector({
    brokerUrl: config.mqtt.brokerUrl,
    username: config.mqtt.username,
    password: config.mqtt.password,
    deviceSerial: config.mqtt.deviceSerial,
  });
  await connector.connect();

  const authProvider = new LocalAuthProvider(pool, config.jwtSecret);
  const hub = new WsHub();
  startCallIngest(pool, companyId, connector, hub);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true, pbxConnected: connector.isConnected() }));
  app.use('/api/auth', authRouter(authProvider));
  app.use('/api/contacts', contactsRouter(pool, authProvider));
  app.use('/api/calls', callsRouter(pool, authProvider, connector));
  app.use('/api/extensions', extensionsRouter(authProvider, connector));

  // Serves the built web app (`npm run build -w web`) same-origin, so one
  // process is everything a single-click launcher needs to start — see
  // start.bat. In dev, web/dist doesn't exist yet (the web app runs via its
  // own Vite dev server instead), so this is skipped entirely.
  const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  const webIndex = path.join(webDist, 'index.html');
  if (fs.existsSync(webIndex)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/|\/ws(?:$|\/)).*/, (_req, res) => res.sendFile(webIndex));
  }

  const server = http.createServer(app);
  hub.attach(server, authProvider);

  server.listen(config.port, () => {
    console.log(`[server] listening on :${config.port}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error:', err);
  process.exitCode = 1;
});
