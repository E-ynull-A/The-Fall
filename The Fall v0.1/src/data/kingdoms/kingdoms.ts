import type { Kingdom } from '../../types/kingdom';

export const PLAYER_KINGDOM_ID = 'ardenhal';

/**
 * Starting kingdoms. The player's realm starts weak on purpose:
 * empty treasury, thin granaries, a small army and shaky loyalty.
 */
export const KINGDOMS: readonly Kingdom[] = [
  {
    id: 'ardenhal',
    name: 'Kingdom of Ardenhal',
    shortName: 'Ardenhal',
    color: '#7a2e2e',
    isPlayer: true,
    capitalProvinceId: 'ardenhal_crown',
    resources: { gold: 20, food: 25, military: 15, stability: 35, legitimacy: 40 },
    personality: 'cautious',
    isEliminated: false,
  },
  {
    id: 'draven',
    name: 'Margravate of Draven',
    shortName: 'Draven',
    color: '#3f4a5a',
    isPlayer: false,
    capitalProvinceId: 'draven_hold',
    resources: { gold: 30, food: 45, military: 28, stability: 55, legitimacy: 60 },
    personality: 'expansionist',
    isEliminated: false,
  },
  {
    id: 'saltmere',
    name: 'Principality of Saltmere',
    shortName: 'Saltmere',
    color: '#4f6b3a',
    isPlayer: false,
    capitalProvinceId: 'saltmere',
    resources: { gold: 50, food: 25, military: 20, stability: 60, legitimacy: 55 },
    personality: 'mercantile',
    isEliminated: false,
  },
];
