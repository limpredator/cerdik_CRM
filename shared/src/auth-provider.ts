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
export interface AuthTokenPayload {
  userId: string;
  companyId: string;
  isAdmin: boolean;
  extension: string | null;
}

export interface AuthProvider {
  login(email: string, password: string): Promise<AuthResult>;
  verifyToken(token: string): Promise<AuthTokenPayload | null>;
  /** Re-signs a token with updated claims (e.g. after picking an extension)
   * without requiring the password again. */
  refreshToken(payload: AuthTokenPayload): Promise<string>;
}
