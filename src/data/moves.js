// cat: 'phys' | 'spec' | 'status'
// effects: { status, chance, stat:[who,stat,stages], drain, recoil, heal, flinch }
export const MOVES = {
  // ---- Wild ----
  barrel:    { name: 'Barrel',     type: 'Wild', cat: 'phys', pow: 40, acc: 100, pp: 35, desc: 'A full-body charge.' },
  rake:      { name: 'Rake',       type: 'Wild', cat: 'phys', pow: 45, acc: 100, pp: 30, desc: 'Rakes the foe with claws.' },
  nip:       { name: 'Nip',        type: 'Wild', cat: 'phys', pow: 35, acc: 100, pp: 30, flinch: 0.3, desc: 'A quick bite that may flinch.' },
  snapjab:   { name: 'Snap Jab',   type: 'Wild', cat: 'phys', pow: 40, acc: 100, pp: 25, priority: 1, desc: 'Always strikes first.' },
  rallycry:  { name: 'Rally Cry',  type: 'Wild', cat: 'status', pow: 0, acc: 100, pp: 20, stat: ['self', 'atk', 1], desc: 'Raises the user\'s Attack.' },
  shrill:    { name: 'Shrill',     type: 'Wild', cat: 'status', pow: 0, acc: 100, pp: 40, stat: ['foe', 'atk', -1], desc: 'Lowers the foe\'s Attack.' },
  tailsweep: { name: 'Tail Sweep', type: 'Wild', cat: 'status', pow: 0, acc: 100, pp: 30, stat: ['foe', 'def', -1], desc: 'Lowers the foe\'s Defence.' },
  slam:      { name: 'Slam',       type: 'Wild', cat: 'phys', pow: 80, acc: 85, pp: 15, desc: 'A heavy body slam.' },
  restcurl:  { name: 'Rest Curl',  type: 'Wild', cat: 'status', pow: 0, acc: 100, pp: 10, heal: 0.5, desc: 'Restores half of max HP.' },
  lastditch: { name: 'Last Ditch', type: 'Wild', cat: 'phys', pow: 120, acc: 80, pp: 5, recoil: 0.25, desc: 'Huge power, hurts the user.' },

  // ---- Verdant ----
  leafcutter: { name: 'Leaf Cutter', type: 'Verdant', cat: 'spec', pow: 45, acc: 100, pp: 25, desc: 'Slices with keen leaves.' },
  vinelash:   { name: 'Vine Lash',   type: 'Verdant', cat: 'phys', pow: 55, acc: 95, pp: 20, desc: 'Whips the foe with a vine.' },
  bloombeam:  { name: 'Bloom Beam',  type: 'Verdant', cat: 'spec', pow: 75, acc: 100, pp: 10, desc: 'A beam of blossom light.' },
  sporecloud: { name: 'Spore Cloud', type: 'Verdant', cat: 'status', pow: 0, acc: 75, pp: 15, status: 'sleep', desc: 'Puts the foe to sleep.' },
  rootdrain:  { name: 'Root Drain',  type: 'Verdant', cat: 'spec', pow: 50, acc: 100, pp: 15, drain: 0.5, desc: 'Drains HP from the foe.' },
  brambleslam:{ name: 'Bramble Slam',type: 'Verdant', cat: 'phys', pow: 95, acc: 90, pp: 10, desc: 'Crushes with thorny limbs.' },
  thornguard: { name: 'Thorn Guard', type: 'Verdant', cat: 'status', pow: 0, acc: 100, pp: 20, stat: ['self', 'def', 1], desc: 'Raises the user\'s Defence.' },

  // ---- Ember ----
  emberspit:  { name: 'Ember Spit',  type: 'Ember', cat: 'spec', pow: 45, acc: 100, pp: 25, status: 'burn', chance: 0.1, desc: 'Spits a small flame.' },
  cinderfang: { name: 'Cinder Fang', type: 'Ember', cat: 'phys', pow: 60, acc: 95, pp: 20, status: 'burn', chance: 0.1, desc: 'Bites with glowing fangs.' },
  flareburst: { name: 'Flare Burst', type: 'Ember', cat: 'spec', pow: 85, acc: 100, pp: 10, status: 'burn', chance: 0.1, desc: 'A bursting wave of fire.' },
  smoulder:   { name: 'Smoulder',    type: 'Ember', cat: 'status', pow: 0, acc: 85, pp: 15, status: 'burn', desc: 'Scorches the foe. Burns.' },
  infernocrash:{name: 'Inferno Crash',type: 'Ember', cat: 'phys', pow: 110, acc: 85, pp: 5, recoil: 0.25, desc: 'A blazing tackle. Hurts a lot.' },

  // ---- Tide ----
  bubblejet:  { name: 'Bubble Jet',  type: 'Tide', cat: 'spec', pow: 45, acc: 100, pp: 25, desc: 'Fires a jet of bubbles.' },
  aquafang:   { name: 'Aqua Fang',   type: 'Tide', cat: 'phys', pow: 60, acc: 100, pp: 20, desc: 'Bites with a watery jaw.' },
  tidalbeam:  { name: 'Tidal Beam',  type: 'Tide', cat: 'spec', pow: 85, acc: 100, pp: 10, desc: 'A concentrated water beam.' },
  mistveil:   { name: 'Mist Veil',   type: 'Tide', cat: 'status', pow: 0, acc: 100, pp: 20, stat: ['self', 'spd', 1], desc: 'Raises Sp. Defence.' },
  torrentcrash:{name: 'Torrent Crash',type:'Tide', cat: 'spec', pow: 105, acc: 85, pp: 5, desc: 'A crushing wall of water.' },

  // ---- Spark ----
  staticnip:  { name: 'Static Nip',  type: 'Spark', cat: 'phys', pow: 40, acc: 100, pp: 25, status: 'para', chance: 0.2, desc: 'A crackling bite.' },
  voltarc:    { name: 'Volt Arc',    type: 'Spark', cat: 'spec', pow: 65, acc: 100, pp: 15, status: 'para', chance: 0.1, desc: 'An arc of live current.' },
  stormbolt:  { name: 'Storm Bolt',  type: 'Spark', cat: 'spec', pow: 95, acc: 90, pp: 10, status: 'para', chance: 0.2, desc: 'Calls down a bolt.' },
  chargeup:   { name: 'Charge Up',   type: 'Spark', cat: 'status', pow: 0, acc: 100, pp: 20, stat: ['self', 'spa', 1], desc: 'Raises Sp. Attack.' },
  shockweb:   { name: 'Shock Web',   type: 'Spark', cat: 'status', pow: 0, acc: 90, pp: 20, status: 'para', desc: 'Paralyses the foe.' },

  // ---- Stone ----
  pebbletoss: { name: 'Pebble Toss', type: 'Stone', cat: 'phys', pow: 45, acc: 100, pp: 25, desc: 'Hurls sharp pebbles.' },
  rockslam:   { name: 'Rock Slam',   type: 'Stone', cat: 'phys', pow: 70, acc: 95, pp: 15, desc: 'Slams with a stone limb.' },
  quake:      { name: 'Quake',       type: 'Stone', cat: 'phys', pow: 95, acc: 100, pp: 10, desc: 'Shakes the whole field.' },
  ironshell:  { name: 'Iron Shell',  type: 'Stone', cat: 'status', pow: 0, acc: 100, pp: 15, stat: ['self', 'def', 2], desc: 'Sharply raises Defence.' },

  // ---- Gale ----
  gustslash:  { name: 'Gust Slash',  type: 'Gale', cat: 'spec', pow: 45, acc: 100, pp: 25, desc: 'A blade of moving air.' },
  wingbeat:   { name: 'Wing Beat',   type: 'Gale', cat: 'phys', pow: 60, acc: 100, pp: 20, desc: 'Strikes with both wings.' },
  cyclone:    { name: 'Cyclone',     type: 'Gale', cat: 'spec', pow: 85, acc: 95, pp: 10, desc: 'Traps the foe in a vortex.' },
  updraft:    { name: 'Updraft',     type: 'Gale', cat: 'status', pow: 0, acc: 100, pp: 20, stat: ['self', 'spe', 2], desc: 'Sharply raises Speed.' },

  // ---- Umbra ----
  shadownip:  { name: 'Shadow Nip',  type: 'Umbra', cat: 'phys', pow: 45, acc: 100, pp: 25, desc: 'Bites from within a shadow.' },
  duskwave:   { name: 'Dusk Wave',   type: 'Umbra', cat: 'spec', pow: 65, acc: 100, pp: 15, desc: 'A wave of creeping dark.' },
  nightmaw:   { name: 'Night Maw',   type: 'Umbra', cat: 'phys', pow: 90, acc: 90, pp: 10, desc: 'A savage midnight bite.' },
  dreadgaze:  { name: 'Dread Gaze',  type: 'Umbra', cat: 'status', pow: 0, acc: 100, pp: 15, stat: ['foe', 'spd', -2], desc: 'Sharply lowers Sp. Defence.' },

  // ---- Aether ----
  lumenray:   { name: 'Lumen Ray',   type: 'Aether', cat: 'spec', pow: 60, acc: 100, pp: 20, desc: 'A ray of gentle light.' },
  prismpulse: { name: 'Prism Pulse', type: 'Aether', cat: 'spec', pow: 90, acc: 100, pp: 10, desc: 'Splinters light at the foe.' },
  mendlight:  { name: 'Mend Light',  type: 'Aether', cat: 'status', pow: 0, acc: 100, pp: 10, heal: 0.5, desc: 'Restores half of max HP.' },
  auraguard:  { name: 'Aura Guard',  type: 'Aether', cat: 'status', pow: 0, acc: 100, pp: 15, stat: ['self', 'spd', 2], desc: 'Sharply raises Sp. Defence.' },
};

export const STAT_NAMES = { hp: 'HP', atk: 'ATTACK', def: 'DEFENCE', spa: 'SP.ATK', spd: 'SP.DEF', spe: 'SPEED' };
