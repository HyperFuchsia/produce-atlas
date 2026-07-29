// Base stats follow the Gen-3 shape: 6 stats, IVs 0-31, medium-fast growth.
export const SPECIES = {
  sproutle: {
    name: 'SPROUTLE', types: ['Verdant'], num: 1,
    base: { hp: 45, atk: 49, def: 52, spa: 60, spd: 58, spe: 45 },
    catchRate: 45, baseExp: 62, evolve: { level: 16, into: 'thornix' },
    learn: [[1, 'barrel'], [1, 'leafcutter'], [5, 'shrill'], [9, 'vinelash'], [13, 'thornguard'],
            [17, 'rootdrain'], [22, 'sporecloud'], [27, 'bloombeam'], [33, 'slam'], [40, 'brambleslam']],
    dex: 'A shy seedling. The sprout on its head turns to follow the morning sun.',
  },
  thornix: {
    name: 'THORNIX', types: ['Verdant'], num: 2,
    base: { hp: 60, atk: 64, def: 68, spa: 78, spd: 72, spe: 58 },
    catchRate: 45, baseExp: 142, evolve: { level: 34, into: 'bramblore' },
    learn: [[1, 'barrel'], [1, 'leafcutter'], [1, 'shrill'], [9, 'vinelash'], [13, 'thornguard'],
            [18, 'rootdrain'], [24, 'sporecloud'], [30, 'bloombeam'], [37, 'slam'], [45, 'brambleslam']],
    dex: 'Thorns along its back harden in autumn. It shelters smaller creatures beneath them.',
  },
  bramblore: {
    name: 'BRAMBLORE', types: ['Verdant', 'Stone'], num: 3,
    base: { hp: 80, atk: 88, def: 92, spa: 105, spd: 94, spe: 66 },
    catchRate: 45, baseExp: 236,
    learn: [[1, 'vinelash'], [1, 'leafcutter'], [1, 'thornguard'], [18, 'rootdrain'], [24, 'sporecloud'],
            [32, 'bloombeam'], [40, 'quake'], [48, 'brambleslam'], [55, 'lastditch']],
    dex: 'An old growth walker. Villages once planted their boundary stones where one had slept.',
  },

  emberet: {
    name: 'EMBERET', types: ['Ember'], num: 4,
    base: { hp: 42, atk: 60, def: 45, spa: 62, spd: 48, spe: 62 },
    catchRate: 45, baseExp: 63, evolve: { level: 16, into: 'flaraze' },
    learn: [[1, 'rake'], [1, 'emberspit'], [5, 'rallycry'], [9, 'nip'], [13, 'smoulder'],
            [17, 'cinderfang'], [22, 'snapjab'], [27, 'flareburst'], [33, 'slam'], [40, 'infernocrash']],
    dex: 'The flame on its tail brightens when it is pleased and gutters when it is scolded.',
  },
  flaraze: {
    name: 'FLARAZE', types: ['Ember'], num: 5,
    base: { hp: 58, atk: 76, def: 58, spa: 80, spd: 62, spe: 80 },
    catchRate: 45, baseExp: 144, evolve: { level: 34, into: 'pyrelith' },
    learn: [[1, 'rake'], [1, 'emberspit'], [1, 'rallycry'], [9, 'nip'], [13, 'smoulder'],
            [18, 'cinderfang'], [24, 'snapjab'], [30, 'flareburst'], [37, 'slam'], [45, 'infernocrash']],
    dex: 'It runs the ridgelines at dusk. Twin flames trail behind it like a signal fire.',
  },
  pyrelith: {
    name: 'PYRELITH', types: ['Ember', 'Stone'], num: 6,
    base: { hp: 78, atk: 104, def: 78, spa: 100, spd: 80, spe: 95 },
    catchRate: 45, baseExp: 240,
    learn: [[1, 'cinderfang'], [1, 'emberspit'], [1, 'rallycry'], [18, 'smoulder'], [24, 'snapjab'],
            [32, 'flareburst'], [40, 'rockslam'], [48, 'infernocrash'], [55, 'lastditch']],
    dex: 'Its mane is genuine fire. Snow melts in a wide ring wherever it chooses to rest.',
  },

  rilldrop: {
    name: 'RILLDROP', types: ['Tide'], num: 7,
    base: { hp: 50, atk: 50, def: 58, spa: 58, spd: 60, spe: 45 },
    catchRate: 45, baseExp: 63, evolve: { level: 16, into: 'splashke' },
    learn: [[1, 'barrel'], [1, 'bubblejet'], [5, 'tailsweep'], [9, 'mistveil'], [13, 'aquafang'],
            [17, 'restcurl'], [22, 'snapjab'], [27, 'tidalbeam'], [33, 'slam'], [40, 'torrentcrash']],
    dex: 'Its body holds a swallow of spring water that never goes stale, however far it travels.',
  },
  splashke: {
    name: 'SPLASHKE', types: ['Tide'], num: 8,
    base: { hp: 65, atk: 66, def: 74, spa: 74, spd: 76, spe: 58 },
    catchRate: 45, baseExp: 145, evolve: { level: 34, into: 'tidalus' },
    learn: [[1, 'barrel'], [1, 'bubblejet'], [1, 'tailsweep'], [9, 'mistveil'], [13, 'aquafang'],
            [18, 'restcurl'], [24, 'snapjab'], [30, 'tidalbeam'], [37, 'slam'], [45, 'torrentcrash']],
    dex: 'A tireless swimmer. It tows driftwood back to shore for no reason anyone has worked out.',
  },
  tidalus: {
    name: 'TIDALUS', types: ['Tide', 'Gale'], num: 9,
    base: { hp: 90, atk: 88, def: 96, spa: 96, spd: 98, spe: 62 },
    catchRate: 45, baseExp: 239,
    learn: [[1, 'aquafang'], [1, 'bubblejet'], [1, 'mistveil'], [18, 'restcurl'], [24, 'snapjab'],
            [32, 'tidalbeam'], [40, 'cyclone'], [48, 'torrentcrash'], [55, 'lastditch']],
    dex: 'Old sailors read the weather from the height of its crest before they trusted any chart.',
  },

  voltpip: {
    name: 'VOLTPIP', types: ['Spark'], num: 10,
    base: { hp: 38, atk: 48, def: 40, spa: 58, spd: 45, spe: 75 },
    catchRate: 190, baseExp: 58, evolve: { level: 24, into: 'arcferret' },
    learn: [[1, 'barrel'], [1, 'staticnip'], [6, 'shrill'], [10, 'chargeup'], [15, 'voltarc'],
            [20, 'shockweb'], [26, 'snapjab'], [32, 'stormbolt'], [38, 'slam']],
    dex: 'It stores a charge in its cheeks and discharges when startled, which is often.',
  },
  arcferret: {
    name: 'ARCFERRET', types: ['Spark'], num: 11,
    base: { hp: 62, atk: 75, def: 58, spa: 85, spd: 65, spe: 105 },
    catchRate: 75, baseExp: 168,
    learn: [[1, 'staticnip'], [1, 'chargeup'], [15, 'voltarc'], [20, 'shockweb'], [26, 'snapjab'],
            [34, 'stormbolt'], [42, 'updraft'], [50, 'lastditch']],
    dex: 'Fast enough to outrun its own thunder. Farmers hang bells on gates to hear it coming.',
  },

  pebblit: {
    name: 'PEBBLIT', types: ['Stone'], num: 12,
    base: { hp: 55, atk: 62, def: 80, spa: 32, spd: 45, spe: 28 },
    catchRate: 190, baseExp: 57, evolve: { level: 28, into: 'boulderon' },
    learn: [[1, 'barrel'], [1, 'pebbletoss'], [6, 'tailsweep'], [11, 'ironshell'], [16, 'rockslam'],
            [22, 'restcurl'], [28, 'slam'], [35, 'quake']],
    dex: 'Hatches from a crack in a cliff face. The crystals on its back grow one ring a year.',
  },
  boulderon: {
    name: 'BOULDERON', types: ['Stone'], num: 13,
    base: { hp: 85, atk: 95, def: 125, spa: 45, spd: 60, spe: 38 },
    catchRate: 75, baseExp: 172,
    learn: [[1, 'pebbletoss'], [1, 'ironshell'], [16, 'rockslam'], [22, 'restcurl'], [30, 'slam'],
            [38, 'quake'], [46, 'lastditch']],
    dex: 'It sleeps standing in riverbeds. Whole footpaths have been built over one by mistake.',
  },

  wispwing: {
    name: 'WISPWING', types: ['Gale'], num: 14,
    base: { hp: 42, atk: 48, def: 42, spa: 55, spd: 45, spe: 72 },
    catchRate: 190, baseExp: 56, evolve: { level: 24, into: 'galehawk' },
    learn: [[1, 'barrel'], [1, 'gustslash'], [6, 'shrill'], [11, 'wingbeat'], [16, 'updraft'],
            [21, 'snapjab'], [28, 'cyclone'], [35, 'slam']],
    dex: 'It rides warm air off the rooftops and only lands when the thermals give out.',
  },
  galehawk: {
    name: 'GALEHAWK', types: ['Gale'], num: 15,
    base: { hp: 70, atk: 80, def: 65, spa: 78, spd: 68, spe: 100 },
    catchRate: 75, baseExp: 170,
    learn: [[1, 'gustslash'], [1, 'wingbeat'], [16, 'updraft'], [21, 'snapjab'], [30, 'cyclone'],
            [38, 'slam'], [46, 'lastditch']],
    dex: 'Its dive is silent until the last second. Even then, all you hear is the air closing.',
  },

  shadeling: {
    name: 'SHADELING', types: ['Umbra'], num: 16,
    base: { hp: 45, atk: 42, def: 45, spa: 72, spd: 60, spe: 62 },
    catchRate: 150, baseExp: 62, evolve: { level: 30, into: 'duskmaw' },
    learn: [[1, 'shadownip'], [1, 'shrill'], [8, 'dreadgaze'], [14, 'duskwave'], [20, 'nip'],
            [26, 'restcurl'], [33, 'nightmaw'], [40, 'slam']],
    dex: 'Fond of lantern-lit doorways. It copies the shape of whatever last stood in the light.',
  },
  duskmaw: {
    name: 'DUSKMAW', types: ['Umbra'], num: 17,
    base: { hp: 75, atk: 92, def: 70, spa: 95, spd: 80, spe: 85 },
    catchRate: 60, baseExp: 186,
    learn: [[1, 'shadownip'], [1, 'dreadgaze'], [14, 'duskwave'], [20, 'nip'], [28, 'restcurl'],
            [36, 'nightmaw'], [44, 'lastditch']],
    dex: 'It hunts the hour between the last light and the first lamp, and never a minute longer.',
  },

  aurelith: {
    name: 'AURELITH', types: ['Aether'], num: 18,
    base: { hp: 90, atk: 90, def: 90, spa: 120, spd: 110, spe: 100 },
    catchRate: 3, baseExp: 280,
    learn: [[1, 'lumenray'], [1, 'auraguard'], [1, 'mendlight'], [40, 'prismpulse'], [50, 'lastditch']],
    dex: 'Recorded once a century, always at the deepest part of the hollow, always alone.',
  },
};

export const SPECIES_LIST = Object.keys(SPECIES);

/** Medium-fast growth: total XP for a level. */
export function xpForLevel(level) {
  return Math.floor(level * level * level);
}

export function levelFromXp(xp) {
  let lv = 1;
  while (lv < 100 && xpForLevel(lv + 1) <= xp) lv++;
  return lv;
}
