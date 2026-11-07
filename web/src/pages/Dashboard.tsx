import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, EmptyState, PageHeader } from '../components/ui';

type Summary = Awaited<ReturnType<typeof api.reportsSummary>>;

// Palette validated with the dataviz skill's validate_palette.js (light + dark):
// the brand accent (indigo-600 #e8691a) sits too close to red on the CVD/normal-vision
// axes (ΔE 4.3/8.1, both fail), so "total" uses blue instead; "missed" keeps the
// existing red semantic from CallLog/MissedCalls.
const TOTAL_COLOR = '#2563eb';
const MISSED_COLOR = '#ef4444';

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </Card>
  );
}

function TrendChart({ daily }: { daily: Summary['daily'] }) {
  if (daily.length === 0) return <EmptyState title="No calls in range" hint="The daily trend will appear once calls come in." />;

  const width = 760;
  const height = 220;
  const padLeft = 32;
  const padBottom = 24;
  const padTop = 8;
  const chartW = width - padLeft - 8;
  const chartH = height - padTop - padBottom;
  const maxVal = Math.max(1, ...daily.map((d) => d.total));
  const groupW = chartW / daily.length;
  const barW = Math.max(2, Math.min(10, groupW / 2 - 2));

  const tickEvery = Math.ceil(daily.length / 7);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Calls and missed calls per day">
      {[0, 0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={padLeft}
          x2={width - 8}
          y1={padTop + chartH * (1 - frac)}
          y2={padTop + chartH * (1 - frac)}
          stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-800"
          strokeWidth={1}
        />
      ))}
      {daily.map((d, i) => {
        const x = padLeft + i * groupW + groupW / 2;
        const totalH = (d.total / maxVal) * chartH;
        const missedH = (d.missed / maxVal) * chartH;
        const showTick = i % tickEvery === 0;
        return (
          <g key={d.day}>
            <rect
              x={x - barW - 1}
              y={padTop + chartH - totalH}
              width={barW}
              height={Math.max(totalH, 1)}
              rx={2}
              fill={TOTAL_COLOR}
            >
              <title>
                {new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {d.total} calls
              </title>
            </rect>
            <rect
              x={x + 1}
              y={padTop + chartH - missedH}
              width={barW}
              height={Math.max(missedH, 1)}
              rx={2}
              fill={MISSED_COLOR}
            >
              <title>
                {new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: {d.missed} missed
              </title>
            </rect>
            {showTick && (
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-zinc-400 dark:fill-zinc-500"
                fontSize={10}
              >
                {new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        );
      })}
      <text x={4} y={padTop + 4} className="fill-zinc-400 dark:fill-zinc-500" fontSize={10}>
        {maxVal}
      </text>
      <text x={4} y={padTop + chartH} className="fill-zinc-400 dark:fill-zinc-500" fontSize={10}>
        0
      </text>
    </svg>
  );
}

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.reportsSummary().then(setSummary).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!summary) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Last 30 days" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total calls" value={String(summary.totalCalls)} />
        <StatTile label="Answer rate" value={`${Math.round(summary.answerRate * 100)}%`} />
        <StatTile label="Avg handle time" value={`${summary.avgHandleSec}s`} />
        <StatTile label="Missed calls" value={String(summary.daily.reduce((sum, d) => sum + d.missed, 0))} />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Calls per day</h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: TOTAL_COLOR }} />
              Total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: MISSED_COLOR }} />
              Missed
            </span>
          </div>
        </div>
        <TrendChart daily={summary.daily} />
      </Card>
    </div>
  );
}
