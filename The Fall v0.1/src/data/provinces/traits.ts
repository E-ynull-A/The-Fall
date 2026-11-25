import type { ProvinceTrait } from '../../types/province';

/**
 * Province traits. Defensive traits are applied in combat (see TRAIT_DEFENSE);
 * the others flavour events and descriptions.
 */
export const PROVINCE_TRAITS: Record<string, ProvinceTrait> = {
  royal_seat: {
    id: 'royal_seat',
    name: 'Royal Seat',
    description: 'Seat of a crown: defenders fight 25% harder. Losing it shatters legitimacy.',
  },
  river_trade: {
    id: 'river_trade',
    name: 'River Trade',
    description: 'Barges on the river bring extra coin.',
  },
  old_walls: {
    id: 'old_walls',
    name: 'Old Walls',
    description: 'Crumbling but still formidable: +15% defense.',
  },
  restless_peasants: {
    id: 'restless_peasants',
    name: 'Restless Peasants',
    description: 'Unrest spreads quickly when bread is short.',
  },
  drought_prone: {
    id: 'drought_prone',
    name: 'Drought-Prone',
    description: 'Rich harvests, but the rains often fail.',
  },
  silver_veins: {
    id: 'silver_veins',
    name: 'Silver Veins',
    description: 'Deep seams of silver; the miners know their worth.',
  },
  deep_harbor: {
    id: 'deep_harbor',
    name: 'Deep Harbor',
    description: 'Ships of every flag anchor here. Vulnerable to blockade.',
  },
  narrow_road: {
    id: 'narrow_road',
    name: 'Narrow Road',
    description: 'A single road through the peaks: +20% defense.',
  },
  lost_crown_land: {
    id: 'lost_crown_land',
    name: 'Lost Crown Land',
    description: 'Once part of Ardenhal. Its people remember.',
  },
  border_garrison: {
    id: 'border_garrison',
    name: 'Border Garrison',
    description: 'A standing garrison watches the frontier: +10% defense.',
  },
};
