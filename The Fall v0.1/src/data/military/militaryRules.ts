import type { ProvinceType } from '../../types/province';
import type { Tactic } from '../../types/military';

/** Tunable military constants (GDD §7). */
export const MILITARY = {
  // Recruitment (per province, once per year)
  recruitGoldPerStrength: 2,
  recruitFoodPerStrength: 1,
  /** Province stability lost per strength recruited. */
  recruitStabilityPerStrength: 2,

  // Defensive works
  fortifyGoldPerLevel: 8,
  maxFortification: 3,

  // Battle
  garrisonStrength: 1.5,
  /** Share of the defender's field army that rushes to defend a province. */
  defenderFieldSupport: 0.4,
  fortificationBonus: 0.25,
  rollMin: 0.85,
  rollMax: 1.15,
  /** Fortification level at which a province must be besieged first. */
  siegeFortification: 2,
  /** Siege army lost each year to disease and desertion. */
  siegeAttrition: 0.1,

  // Conquest consequences
  conqueredStability: 15,
  reclaimedStability: 35,
  /** Years a conquered province pays only half its taxes. */
  occupationYears: 3,
  occupationTaxFactor: 0.5,
  breakPeaceLegitimacy: 3,
  breakPeaceOpinion: 30,
  reclaimLegitimacy: 5,
  loseProvinceLegitimacy: 3,
  loseCapitalLegitimacy: 15,
  loseCapitalStability: 10,
} as const;

export const TERRAIN_DEFENSE: Record<ProvinceType, number> = {
  mountain_pass: 1.5,
  castle: 1.3,
  city: 1.15,
  fertile_lands: 1,
  coastal_port: 1,
  mining_region: 1.05,
};

/** Province traits that strengthen defenders (multipliers). */
export const TRAIT_DEFENSE: Record<string, number> = {
  royal_seat: 1.25,
  old_walls: 1.15,
  narrow_road: 1.2,
  border_garrison: 1.1,
};

/** Terrain where cavalry can sweep around the enemy. */
export const OPEN_TERRAIN: readonly ProvinceType[] = ['fertile_lands', 'coastal_port', 'mining_region'];

export interface TacticInfo {
  label: string;
  description: string;
  /** Multiplier on attacker strength. Flanking depends on terrain. */
  attack: number;
  /** Multiplier on the attacker's own casualties. */
  ownLosses: number;
  /** Multiplier on casualties inflicted on the defender. */
  enemyLosses: number;
}

export const TACTICS: Record<Tactic, TacticInfo> = {
  balanced: {
    label: 'Balanced Advance',
    description: 'A steady, conventional attack.',
    attack: 1,
    ownLosses: 1,
    enemyLosses: 1,
  },
  aggressive: {
    label: 'Aggressive Assault',
    description: 'Throw everything forward. Better odds, heavier losses.',
    attack: 1.25,
    ownLosses: 1.5,
    enemyLosses: 1.2,
  },
  defensive: {
    label: 'Defensive Formation',
    description: 'Advance behind shields. Fewer losses, weaker push.',
    attack: 0.9,
    ownLosses: 0.6,
    enemyLosses: 0.8,
  },
  flanking: {
    label: 'Flanking Maneuver',
    description: 'Strong on open ground, poor in mountains, castles and cities.',
    attack: 1.3,
    ownLosses: 1,
    enemyLosses: 1,
  },
  retreat: {
    label: 'Strategic Retreat',
    description: 'Withdraw before battle is joined. Lose a tenth of the army, keep the rest.',
    attack: 0,
    ownLosses: 0,
    enemyLosses: 0,
  },
};

export const FLANKING_PENALTY = 0.85;
export const RETREAT_LOSS = 0.1;
