import type { TaxLevel } from '../../types/economy';

/**
 * Tunable economy constants (GDD §4, §5). All yearly calculations read from here.
 */
export const ECONOMY = {
  /** Share of a province's tax collected at 0 stability; rises linearly to 100% at 100 stability. */
  minTaxEfficiency: 0.5,
  taxMultiplier: { low: 0.5, normal: 1, high: 1.5 } satisfies Record<TaxLevel, number>,
  /** Province stability change per year caused by the tax level. */
  taxStabilityEffect: { low: 3, normal: 0, high: -4 } satisfies Record<TaxLevel, number>,

  /** Food eaten by each province: base + development. */
  populationFoodBase: 1,
  /** One food per this much military strength. */
  militaryPerFood: 8,
  /** One gold per this much military strength. */
  militaryPerGold: 5,
  /** One gold per this many garrison troops. */
  garrisonPerGold: 4,
  /** Administration = floor(provinces × perProvince) + (provinces above threshold) × overExtension. */
  adminPerProvince: 0.5,
  adminThreshold: 4,
  adminOverExtension: 1,
  castleMaintenance: 1,

  // Unpaid soldiers
  desertionRate: 0.2,
  unpaidStabilityLoss: 3,
  unpaidLegitimacyLoss: 2,

  // Famine
  famineBaseStabilityLoss: 2,
  famineMaxStabilityLoss: 10,
  famineProvinceStabilityLoss: 5,

  // Kingdom ↔ province stability
  /** Kingdom stability closes 1/N of the gap to the province average each year. */
  stabilityDriftDivisor: 8,
  /** Below this kingdom stability, unrest spreads to every province. */
  unrestThreshold: 30,
  unrestProvinceLoss: 2,

  // Legitimacy
  lowStabilityForLegitimacy: 25,
  lowStabilityLegitimacyLoss: 2,
  highStabilityForLegitimacy: 60,
  highStabilityLegitimacyGain: 1,
} as const;

/** Province improvement actions (GDD §3.4). One improvement per province per year. */
export const PROVINCE_ACTIONS = {
  develop_infrastructure: {
    label: 'Develop infrastructure',
    description: '+1 development and +1 tax. More people also eat more.',
    goldCostPerLevel: 6,
    maxDevelopment: 5,
  },
  improve_food: {
    label: 'Improve food production',
    description: '+1 food per year from this province.',
    baseGoldCost: 5,
    maxFood: 10,
  },
  suppress_unrest: {
    label: 'Suppress unrest',
    description: 'Soldiers restore order: +12 province stability, −1 legitimacy.',
    militaryCost: 2,
    stabilityGain: 12,
    legitimacyLoss: 1,
  },
  build_defenses: {
    label: 'Build defenses',
    description: '+1 fortification. Two or more levels force attackers into a siege.',
    goldCostPerLevel: 8,
    maxFortification: 3,
  },
} as const;
