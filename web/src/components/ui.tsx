import type { CSSProperties, ReactNode } from 'react';

// Visual language shared with the rest of the Cerdik Suite (Console, Call
// Billing, softphone): soft, generously rounded, low-contrast borders with
// elevation doing the separating instead of hard lines. Primary actions get
// a pill shape in the brand orange; everything else stays quiet so the
// primary action reads as primary.

export const inputCls =
  'w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none ' +
  'placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ' +
  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20';

export const labelCls = 'mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400';

const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-[1.125rem] py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]';

export const btnPrimary =
  // White on orange in light mode, near-black on orange in dark mode (the
  // orange is too bright for white text on navy) — same pairing as the
  // Suite shell.
  `${btnBase} bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-500 dark:text-[#111] dark:shadow-none`;
export const btnSecondary =
  `${btnBase} border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700`;
export const btnDanger =
  `${btnBase} border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950`;
export const btnGhost =
  `${btnBase} shadow-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`;

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Small colored dot + label — used for the live PBX/WebSocket connection
 * indicator in the agent screen's header. */
export function StatusDot({ tone, label }: { tone: 'ok' | 'warn' | 'error' | 'neutral'; label: string }) {
  const dot =
    tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : tone === 'error' ? 'bg-red-500' : 'bg-zinc-400';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// A small fixed palette of pleasant gradients, picked deterministically from
// a name so the same contact always gets the same color without a database
// column for it.
const AVATAR_GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-emerald-500',
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

/** Colorful initial avatar used anywhere a contact is listed — the call
 * popup, the call log, the missed-call list. Same name always renders the
 * same color. */
export function Avatar({
  name,
  size = 10,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <div
      style={{ height: `${size * 0.25}rem`, width: `${size * 0.25}rem` }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${gradientFor(name)} ${className}`}
    >
      <span style={{ fontSize: `${Math.max(size * 0.09, 0.75)}rem` }}>{initial}</span>
    </div>
  );
}
