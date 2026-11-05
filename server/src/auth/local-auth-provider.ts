import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';
import type { AuthProvider, AuthResult, User } from '@cerdik-crm/shared';

interface UserRow {
  id: string;
  company_id: string;
  role_id: string;
  email: string;
  password_hash: string;
  name: string;
  extension: string | null;
  created_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    companyId: row.company_id,
    roleId: row.role_id,
    email: row.email,
    name: row.name,
    extension: row.extension,
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
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0];
    if (!row) throw new Error('Invalid email or password');
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new Error('Invalid email or password');
    const user = toUser(row);
    const token = jwt.sign({ userId: user.id, companyId: user.companyId }, this.jwtSecret, {
      expiresIn: '12h',
    });
    return { user, token };
  }

  async verifyToken(token: string): Promise<{ userId: string; companyId: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; companyId: string };
      return { userId: decoded.userId, companyId: decoded.companyId };
    } catch {
      return null;
    }
  }
}
