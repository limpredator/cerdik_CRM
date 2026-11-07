import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { btnGhost } from './ui';

function navLinkCls({ isActive }: { isActive: boolean }): string {
  return `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
  }`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, extension, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
              <span className="truncate font-semibold whitespace-nowrap text-zinc-900 dark:text-zinc-50">
                Cerdik CRM
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden text-sm whitespace-nowrap text-zinc-500 dark:text-zinc-400 sm:inline">
                {user?.name} — ext {extension}
              </span>
              <span className="text-sm whitespace-nowrap text-zinc-500 dark:text-zinc-400 sm:hidden">
                ext {extension}
              </span>
              <button onClick={logout} className={`${btnGhost} whitespace-nowrap`}>
                Sign out
              </button>
            </div>
          </div>
          <nav className="-mx-1 mt-2.5 flex items-center gap-1 overflow-x-auto px-1">
            <NavLink to="/" end className={navLinkCls}>
              Dial
            </NavLink>
            <NavLink to="/contacts" className={navLinkCls}>
              Contacts
            </NavLink>
            <NavLink to="/dashboard" className={navLinkCls}>
              Dashboard
            </NavLink>
            <NavLink to="/enquiries" className={navLinkCls}>
              Enquiries
            </NavLink>
            {isAdmin && (
              <NavLink to="/settings" className={navLinkCls}>
                Settings
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
