import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';
import type { AuthProvider, AuthResult, AuthTokenPayload, User } from '@cerdik-crm/shared';

interface UserRow {
  id: string;
  company_id: string;
  role_id: string;
  email: string;
  password_hash: string;
  name: string;
  extension: string | null;
  created_at: Date;
  is_admin: boolean;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    companyId: row.company_id,
    roleId: row.role_id,
    email: row.email,
    name: row.name,
    extension: row.extension,
    isAdmin: row.is_admin,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Local bcrypt + JWT implementation of AuthProvider. Swappable later for a
 * shared/SSO login — nothing outside this file knows passwords are even
 * involved.
 */
export class LocalAuthProvider implements AuthProvider {
  constructor(
    private readonly pool: Pool,
    private readonly jwtSecret: string,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT users.*, roles.is_admin
       FROM users JOIN roles ON roles.id = users.role_id
       WHERE users.email = $1`,
      [email],
    );
    const row = rows[0];
    if (!row) throw new Error('Invalid email or password');
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new Error('Invalid email or password');
    const user = toUser(row);
    const token = jwt.sign(
      { userId: user.id, companyId: user.companyId, isAdmin: user.isAdmin, extension: user.extension },
      this.jwtSecret,
      { expiresIn: '12h' },
    );
    return { user, token };
  }

  async verifyToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  async refreshToken(payload: AuthTokenPayload): Promise<string> {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '12h' });
  }
}
