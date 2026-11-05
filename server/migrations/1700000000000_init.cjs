/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('companies', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
  });
  pgm.addConstraint('roles', 'roles_company_name_unique', 'UNIQUE(company_id, name)');

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'RESTRICT' },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    extension: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('users', 'users_company_email_unique', 'UNIQUE(company_id, email)');

  pgm.createTable('contacts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    company: { type: 'text' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('contacts', 'company_id');

  pgm.createTable('contact_phones', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contact_id: { type: 'uuid', notNull: true, references: 'contacts', onDelete: 'CASCADE' },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    // Always E.164 — normalized before insert, see shared/src/phone.ts.
    e164: { type: 'text', notNull: true },
    label: { type: 'text' },
  });
  pgm.createIndex('contact_phones', ['company_id', 'e164']);

  pgm.createTable('calls', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    // The PBX's own callid (e.g. "1789028588.967") — unique per company,
    // not globally, in case a second PBX connector is added later.
    pbx_call_id: { type: 'text', notNull: true },
    direction: { type: 'text', notNull: true },
    from_e164: { type: 'text', notNull: true },
    to_e164: { type: 'text', notNull: true },
    extension: { type: 'text' },
    contact_id: { type: 'uuid', references: 'contacts', onDelete: 'SET NULL' },
    started_at: { type: 'timestamptz', notNull: true },
    answered_at: { type: 'timestamptz' },
    ended_at: { type: 'timestamptz' },
    duration_sec: { type: 'integer', notNull: true, default: 0 },
    disposition: { type: 'text', notNull: true, default: 'missed' },
    recording_file: { type: 'text' },
  });
  pgm.addConstraint('calls', 'calls_company_pbxcall_unique', 'UNIQUE(company_id, pbx_call_id)');
  pgm.createIndex('calls', 'company_id');
  pgm.createIndex('calls', 'contact_id');
  pgm.createIndex('calls', 'to_e164');
  pgm.createIndex('calls', 'from_e164');

  pgm.createTable('call_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    call_id: { type: 'uuid', notNull: true, references: 'calls', onDelete: 'CASCADE' },
    event_type: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true, default: '{}' },
    occurred_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('call_events', 'call_id');

  // Append-only: who, what, when, from where. No update/delete routes are
  // ever wired to this table — see server/src/audit.ts.
  pgm.createTable('audit_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    action: { type: 'text', notNull: true },
    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'text' },
    occurred_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    ip_address: { type: 'text' },
  });
  pgm.createIndex('audit_log', 'company_id');
};

exports.down = (pgm) => {
  pgm.dropTable('audit_log');
  pgm.dropTable('call_events');
  pgm.dropTable('calls');
  pgm.dropTable('contact_phones');
  pgm.dropTable('contacts');
  pgm.dropTable('users');
  pgm.dropTable('roles');
  pgm.dropTable('companies');
};
