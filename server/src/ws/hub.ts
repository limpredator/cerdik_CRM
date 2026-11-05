import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { AuthProvider } from '@cerdik-crm/shared';

/** One live WS connection per agent, registered under the extension they
 * picked after login (see web's ExtensionPicker) — see register(). Pushes
 * ringing pops and call-ended notices; everything else (call log, missed
 * calls) is plain polling/REST for phase 1. */
export class WsHub {
  private sockets = new Map<string, Set<WebSocket>>();

  attach(server: Server, authProvider: AuthProvider): void {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws, req) => {
      void this.handleConnection(ws, req, authProvider);
    });
  }

  private async handleConnection(ws: WebSocket, req: import('node:http').IncomingMessage, authProvider: AuthProvider): Promise<void> {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    const extension = url.searchParams.get('extension') ?? '';
    const auth = await authProvider.verifyToken(token);
    if (!auth || !extension) {
      ws.close(4001, 'Unauthorized');
      return;
    }
    this.register(extension, ws);
    ws.on('close', () => this.unregister(extension, ws));
  }

  private register(extension: string, ws: WebSocket): void {
    const set = this.sockets.get(extension) ?? new Set<WebSocket>();
    set.add(ws);
    this.sockets.set(extension, set);
  }

  private unregister(extension: string, ws: WebSocket): void {
    this.sockets.get(extension)?.delete(ws);
  }

  broadcastToExtension(extension: string, message: Record<string, unknown>): void {
    const sockets = this.sockets.get(extension);
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}
