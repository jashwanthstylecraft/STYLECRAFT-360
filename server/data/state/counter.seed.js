// Single source of truth for the counter's starting value. Referenced by
// counterService (first boot) and nowhere else — change the base number here
// or via PUT /api/counter, never by editing counter.json directly.
const SEED_TOTAL = 99999999;

module.exports = { SEED_TOTAL };
