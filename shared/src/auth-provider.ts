import type { User } from './models';

export interface AuthResult {
  user: User;
  token: string;
}

/**
 * Login sits behind this interface so the local bcrypt+JWT implementation
 * (server/src/auth/local-auth-provider.ts) can later be swapped for a
 * shared/SSO login without touching any route or UI code that just needs
 * "who is this request from".
 */
export interface AuthProvider {
  login(email: string, password: string): Promise<AuthResult>;
  verifyToken(token: string): Promise<{ userId: string; companyId: string } | null>;
}
