import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AppShell } from './components/AppShell';
import { EmptyState } from './components/ui';
import { Login } from './pages/Login';
import { ExtensionPicker } from './pages/ExtensionPicker';
import { AgentScreen } from './pages/AgentScreen';
import { DialConfirm } from './pages/DialConfirm';
import { Settings } from './pages/Settings';
import { Contacts } from './pages/Contacts';
import { ContactDetail } from './pages/ContactDetail';
import { Dashboard } from './pages/Dashboard';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireExtension({ children }: { children: React.ReactElement }) {
  const { user, extension } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!extension) return <Navigate to="/pick-extension" replace />;
  return <AppShell>{children}</AppShell>;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/pick-extension"
        element={
          <RequireAuth>
            <ExtensionPicker />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireExtension>
            <AgentScreen />
          </RequireExtension>
        }
      />
      <Route
        path="/dial"
        element={
          <RequireExtension>
            <DialConfirm />
          </RequireExtension>
        }
      />
      <Route
        path="/contacts"
        element={
          <RequireExtension>
            <Contacts />
          </RequireExtension>
        }
      />
      <Route
        path="/contacts/:id"
        element={
          <RequireExtension>
            <ContactDetail />
          </RequireExtension>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireExtension>
            <Dashboard />
          </RequireExtension>
        }
      />
      <Route
        path="/enquiries"
        element={
          <RequireExtension>
            <EmptyState title="Enquiries" hint="Coming soon." />
          </RequireExtension>
        }
      />
      <Route
        path="/enquiries/:id"
        element={
          <RequireExtension>
            <EmptyState title="Enquiry" hint="Coming soon." />
          </RequireExtension>
        }
      />
      <Route
        path="/settings/*"
        element={
          <RequireExtension>
            <RequireAdmin>
              <Settings />
            </RequireAdmin>
          </RequireExtension>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
