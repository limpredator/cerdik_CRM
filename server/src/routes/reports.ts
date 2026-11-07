import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthProvider } from '@cerdik-crm/shared';
import { requireAuth, type AuthedRequest } from './middleware';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseRange(req: AuthedRequest): { from: Date; to: Date } {
  const toParam = typeof req.query.to === 'string' ? new Date(req.query.to) : null;
  const fromParam = typeof req.query.from === 'string' ? new Date(req.query.from) : null;
  const to = toParam && !Number.isNaN(toParam.getTime()) ? toParam : new Date();
  const from = fromParam && !Number.isNaN(fromParam.getTime()) ? fromParam : new Date(to.getTime() - 30 * DAY_MS);
  return { from, to };
}

/** One admin/agent-scoped endpoint, two queries: running totals for the
 * stat tiles and a daily series for the trend chart. */
export function reportsRouter(pool: Pool, authProvider: AuthProvider): Router {
  const router = Router();
  router.use(requireAuth(authProvider));

  router.get('/summary', async (req: AuthedRequest, res) => {
    const { companyId, isAdmin, extension } = req.auth!;
    const { from, to } = parseRange(req);

    const conditions = ['company_id = $1', 'started_at >= $2', 'started_at < $3'];
    const params: unknown[] = [companyId, from.toISOString(), to.toISOString()];
    if (!isAdmin) {
      params.push(extension);
      conditions.push(`extension = $${params.length}`);
    }
    const where = conditions.join(' AND ');

    const { rows: totalsRows } = await pool.query<{
      total: string;
      answered: string;
      avg_handle_sec: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE disposition = 'answered') AS answered,
         COALESCE(AVG(duration_sec) FILTER (WHERE disposition = 'answered'), 0) AS avg_handle_sec
       FROM calls
       WHERE ${where}`,
      params,
    );
    const totals = totalsRows[0];

    const { rows: dailyRows } = await pool.query<{ day: Date; total: string; missed: string }>(
      `SELECT date_trunc('day', started_at) AS day,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE direction = 'inbound' AND disposition != 'answered') AS missed
       FROM calls
       WHERE ${where}
       GROUP BY day
       ORDER BY day`,
      params,
    );

    const total = Number(totals.total);
    const answered = Number(totals.answered);
    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      totalCalls: total,
      answeredCalls: answered,
      answerRate: total > 0 ? answered / total : 0,
      avgHandleSec: Math.round(Number(totals.avg_handle_sec)),
      daily: dailyRows.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        total: Number(row.total),
        missed: Number(row.missed),
      })),
    });
  });

  return router;
}
