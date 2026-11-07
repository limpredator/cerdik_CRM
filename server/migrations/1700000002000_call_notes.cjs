/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumns('calls', {
    // Free-text, not a fixed taxonomy — this is the business's own call
    // outcome process, not ours to hard-code. `disposition` (system-derived
    // answered/missed/etc.) stays untouched.
    outcome: { type: 'text' },
    notes: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('calls', ['outcome', 'notes']);
};
