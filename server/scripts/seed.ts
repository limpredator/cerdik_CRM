import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool';

/** Creates the single company row this install runs as, an admin role, and
 * one admin user — idempotent, safe to re-run. Run with: npm run seed -w server */
async function main(): Promise<void> {
  const companyName = process.env.COMPANY_NAME ?? 'Default Company';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-now';
  const adminExtension = process.env.SEED_ADMIN_EXTENSION ?? null;

  const { rows: existingCompany } = await pool.query<{ id: string }>('SELECT id FROM companies LIMIT 1');
  const companyId =
    existingCompany[0]?.id ??
    (await pool.query<{ id: string }>('INSERT INTO companies (name) VALUES ($1) RETURNING id', [companyName]))
      .rows[0].id;

  const { rows: existingRole } = await pool.query<{ id: string }>(
    'SELECT id FROM roles WHERE company_id = $1 AND name = $2',
    [companyId, 'admin'],
  );
  const roleId =
    existingRole[0]?.id ??
    (
      await pool.query<{ id: string }>('INSERT INTO roles (company_id, name) VALUES ($1, $2) RETURNING id', [
        companyId,
        'admin',
      ])
    ).rows[0].id;

  const { rows: existingUser } = await pool.query('SELECT id FROM users WHERE company_id = $1 AND email = $2', [
    companyId,
    adminEmail,
  ]);
  if (existingUser.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (company_id, role_id, email, password_hash, name, extension) VALUES ($1,$2,$3,$4,$5,$6)',
      [companyId, roleId, adminEmail, passwordHash, 'Admin', adminExtension],
    );
    console.log(`Seeded admin user ${adminEmail} (password from SEED_ADMIN_PASSWORD).`);
  } else {
    console.log(`Admin user ${adminEmail} already exists — skipped.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
