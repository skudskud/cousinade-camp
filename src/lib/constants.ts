export const APP_PASSWORD = 'cousinade2026';

export const FAMILY_NAMES = [
  'Huy Vu', 'Lara', 'Minh Van', 'Naomi', 'Thuy Vi', 'Nathan',
  'Marie', 'Nicolas', 'Julie', 'Etienne', 'Alix', 'Celia',
  'Yasser', 'Ti Pou', 'Ti C', 'Grégory', 'Adeline', 'Charles',
  'Adrien', 'Malik', 'Copine Malik', 'Karim', 'Yanis', 'Ryan',
  'Kate', 'Cyril', 'Quentin',
];

export const HAT_OPTIONS = ['none', '#e74c3c', '#3498db', '#f39c12', '#2ecc71'] as const;
export const TOP_OPTIONS = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'] as const;
export const BOTTOM_OPTIONS = ['#2c3e50', '#e74c3c', '#3498db', '#27ae60', '#8e44ad'] as const;

export const HAT_LABELS = ['Aucun', 'Rouge', 'Bleu', 'Orange', 'Vert'];
export const TOP_LABELS = ['Rouge', 'Bleu', 'Orange', 'Vert', 'Violet'];
export const BOTTOM_LABELS = ['Noir', 'Rouge', 'Bleu', 'Vert', 'Violet'];

export type RoomId = 'cuisine' | 'jeux' | 'piscine';

export interface Prompt {
  key: string;
  label: string;
  type: 'text' | 'choice' | 'number';
  choices?: string[];
}

export const ROOMS: Record<RoomId, { name: string; prompts: Prompt[] }> = {
  cuisine: {
    name: '🍳 Cuisine',
    prompts: [
      { key: 'repas_midi', label: 'Idées repas midi', type: 'text' },
      { key: 'repas_soir', label: 'Idées repas soir', type: 'text' },
      { key: 'allergenes', label: 'Allergènes', type: 'text' },
      { key: 'regimes', label: 'Régimes spéciaux', type: 'text' },
      { key: 'pas_aime', label: "Ce que je n'aime pas", type: 'text' },
      { key: 'adore', label: "Ce que j'adore", type: 'text' },
      { key: 'specialite', label: 'Si je ramène une spécialité de ma région : quoi ?', type: 'text' },
      { key: 'aime_cuisiner', label: "J'aime cuisiner", type: 'choice', choices: ['oui', 'bof', 'non'] },
      { key: 'budget_repas', label: 'Mon budget repas (€)', type: 'number' },
    ],
  },
  jeux: {
    name: '🎲 Salle de jeux',
    prompts: [
      { key: 'jeux_ramene', label: 'Jeux de société que je ramène', type: 'text' },
      { key: 'jeux_longue', label: 'Propositions de jeux longue durée (ex: Killer)', type: 'text' },
      { key: 'jeux_souhaites', label: "Jeux que je n'ai pas mais si quelqu'un l'a, trop bien", type: 'text' },
    ],
  },
  piscine: {
    name: '🏊 Piscine & Sorties',
    prompts: [
      { key: 'activites_envie', label: "Activités que j'ai envie de faire", type: 'text' },
      { key: 'activites_pas_envie', label: "Activités que je n'ai pas envie de faire", type: 'text' },
      { key: 'budget_activite', label: 'Mon budget activité (€)', type: 'number' },
    ],
  },
};

// Map tile types
export const TILE = {
  GRASS: 0,
  TREE: 1,
  WATER: 2,
  PATH: 3,
  ROCK: 4,
  CABIN: 5,
  ZONE_CUISINE: 6,
  ZONE_JEUX: 7,
  ZONE_PISCINE: 8,
  SIGN: 9,
  FLOWER: 10,
} as const;

const T = TILE;

// 20x15 map
export const MAP_DATA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
  [1,0,10,0,0,1,0,0,0,0,0,0,0,0,1,0,0,10,0,1],
  [1,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0,0,1],
  [1,1,0,3,0,0,0,0,0,5,5,0,0,0,0,0,3,0,1,1],
  [1,0,0,3,0,0,0,0,9,6,6,9,0,0,0,0,3,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
  [1,10,0,3,3,3,3,0,0,0,0,0,0,3,3,3,3,0,10,1],
  [1,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0,0,1],
  [1,0,0,0,9,7,3,0,0,10,10,0,0,3,8,9,0,0,0,1],
  [1,0,0,0,0,7,3,0,0,0,0,0,0,3,8,0,0,0,0,1],
  [1,0,10,0,0,0,3,3,3,3,3,3,3,3,0,0,0,10,0,1],
  [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
  [1,0,0,4,0,0,0,0,2,2,2,2,0,0,0,0,4,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;
export const TILE_SIZE = 64;

export const ZONE_POSITIONS: Record<RoomId, { x: number; y: number }> = {
  cuisine: { x: 9, y: 5 },
  jeux: { x: 5, y: 9 },
  piscine: { x: 14, y: 9 },
};

export const SPAWN_POS = { x: 9, y: 7 };

export function isSolid(tile: number): boolean {
  return tile === T.TREE || tile === T.WATER || tile === T.ROCK || tile === T.CABIN || tile === T.SIGN;
}

export function getZoneAt(x: number, y: number): RoomId | null {
  const tile = MAP_DATA[y]?.[x];
  if (tile === T.ZONE_CUISINE) return 'cuisine';
  if (tile === T.ZONE_JEUX) return 'jeux';
  if (tile === T.ZONE_PISCINE) return 'piscine';
  return null;
}
