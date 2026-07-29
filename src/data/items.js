// kind: 'orb' (capture), 'heal', 'status', 'revive', 'ether', 'key'
export const ITEMS = {
  bondorb:  { name: 'BOND ORB',  kind: 'orb', rate: 1.0, price: 200, desc: 'A resin sphere that coaxes a wild creature into travelling with you.' },
  greatorb: { name: 'GREAT ORB', kind: 'orb', rate: 1.5, price: 600, desc: 'A finer orb with a much better hold than a BOND ORB.' },
  primeorb: { name: 'PRIME ORB', kind: 'orb', rate: 2.0, price: 1200, desc: 'The best orb the guilds will sell to a wanderer.' },

  salve:    { name: 'SALVE',     kind: 'heal', amount: 20, price: 300, desc: 'A herbal paste. Restores 20 HP.' },
  tonic:    { name: 'TONIC',     kind: 'heal', amount: 50, price: 700, desc: 'A bitter draught. Restores 50 HP.' },
  granddraught:{ name: 'GRAND DRAUGHT', kind: 'heal', amount: 200, price: 1800, desc: 'Restores 200 HP to one creature.' },
  fullbalm: { name: 'FULL BALM', kind: 'heal', amount: 9999, price: 3000, desc: 'Restores a creature to full health.' },

  balm:     { name: 'BALM',      kind: 'status', cures: 'all', price: 250, desc: 'Clears burn, sleep or paralysis.' },
  revive:   { name: 'REVIVE',    kind: 'revive', frac: 0.5, price: 1500, desc: 'Rouses a fainted creature with half its HP.' },
  mint:     { name: 'FOCUS MINT',kind: 'ether', amount: 10, price: 400, desc: 'Restores 10 PP to one move.' },

  charm:    { name: 'HOLLOW CHARM', kind: 'key', price: 0, desc: 'A cold stone charm from the hollow. It hums near old places.' },
};

export const SHOP_STOCK = ['bondorb', 'greatorb', 'salve', 'tonic', 'balm', 'revive'];
