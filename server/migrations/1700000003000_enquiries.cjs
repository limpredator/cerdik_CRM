/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('enquiries', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    contact_id: { type: 'uuid', references: 'contacts', onDelete: 'SET NULL' },
    // Free text, not a DB enum — a new channel (WhatsApp, etc.) needs no migration.
    channel: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'new' },
    subject: { type: 'text' },
    assigned_to: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('enquiries', 'company_id');
  pgm.createIndex('enquiries', 'contact_id');

  pgm.createTable('enquiry_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    enquiry_id: { type: 'uuid', notNull: true, references: 'enquiries', onDelete: 'CASCADE' },
    company_id: { type: 'uuid', notNull: true, references: 'companies', onDelete: 'CASCADE' },
    direction: { type: 'text', notNull: true },
    sender_name: { type: 'text' },
    sender_contact: { type: 'text' },
    body: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('enquiry_messages', 'enquiry_id');
};

exports.down = (pgm) => {
  pgm.dropTable('enquiry_messages');
  pgm.dropTable('enquiries');
};
