/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumn('roles', {
    is_admin: { type: 'boolean', notNull: true, default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('roles', 'is_admin');
};
