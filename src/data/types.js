export const TYPES = ['Wild', 'Ember', 'Tide', 'Verdant', 'Spark', 'Stone', 'Gale', 'Umbra', 'Aether'];

// Only non-neutral matchups are listed: CHART[attacker][defender].
const CHART = {
  Wild: { Stone: 0.5 },
  Ember: { Verdant: 2, Tide: 0.5, Stone: 0.5, Ember: 0.5 },
  Tide: { Ember: 2, Stone: 2, Tide: 0.5, Verdant: 0.5, Spark: 0.5 },
  Verdant: { Tide: 2, Stone: 2, Verdant: 0.5, Ember: 0.5, Gale: 0.5, Aether: 0.5 },
  Spark: { Tide: 2, Gale: 2, Spark: 0.5, Verdant: 0.5, Stone: 0.5 },
  Stone: { Ember: 2, Gale: 2, Spark: 2, Stone: 0.5, Verdant: 0.5, Tide: 0.5 },
  Gale: { Verdant: 2, Umbra: 2, Gale: 0.5, Spark: 0.5, Stone: 0.5 },
  Umbra: { Aether: 2, Umbra: 0.5, Gale: 0.5 },
  Aether: { Umbra: 2, Aether: 0.5, Stone: 0.5 },
};

export function typeMult(attackType, defenderTypes) {
  let m = 1;
  const row = CHART[attackType] || {};
  for (const t of defenderTypes) m *= row[t] ?? 1;
  return m;
}

export const TYPE_COLOR = {
  Wild: '#a89078',
  Ember: '#e0602c',
  Tide: '#3a86d8',
  Verdant: '#4aa845',
  Spark: '#e8c034',
  Stone: '#a8874a',
  Gale: '#6ec0c8',
  Umbra: '#6a4a8c',
  Aether: '#d878b8',
};
