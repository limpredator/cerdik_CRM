import { NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { AuditLogPage } from './AuditLogPage';
import { DialHandlerPage } from './DialHandlerPage';

const linkCls = ({ isActive }: { isActive: boolean }): string =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
  }`;

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="mb-5 flex items-center gap-1">
        <NavLink to="/settings/audit-log" className={linkCls}>
          Audit log
        </NavLink>
        <NavLink to="/settings/dial-handler" className={linkCls}>
          Click-to-dial
        </NavLink>
      </div>
      <Routes>
        <Route index element={<AuditLogPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="dial-handler" element={<DialHandlerPage />} />
      </Routes>
    </div>
  );
}
