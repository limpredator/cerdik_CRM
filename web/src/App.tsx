import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { ExtensionPicker } from './pages/ExtensionPicker';
import { AgentScreen } from './pages/AgentScreen';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireExtension({ children }: { children: React.ReactElement }) {
  const { user, extension } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!extension) return <Navigate to="/pick-extension" replace />;
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
