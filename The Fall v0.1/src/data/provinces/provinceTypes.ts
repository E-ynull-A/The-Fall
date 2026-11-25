import type { ProvinceType } from '../../types/province';

export interface ProvinceTypeInfo {
  label: string;
  benefit: string;
  risk: string;
}

/** GDD §3.3 province type table. */
export const PROVINCE_TYPES: Record<ProvinceType, ProvinceTypeInfo> = {
  fertile_lands: { label: 'Fertile Lands', benefit: 'Food production', risk: 'Drought' },
  mountain_pass: { label: 'Mountain Pass', benefit: 'Defensive advantage', risk: 'Limited income' },
  coastal_port: { label: 'Coastal Port', benefit: 'Trade income', risk: 'Blockade' },
  mining_region: { label: 'Mining Region', benefit: 'Gold production', risk: 'Labor unrest' },
  city: { label: 'City', benefit: 'Taxes and commerce', risk: 'Crime and rebellion' },
  castle: { label: 'Castle', benefit: 'Military defense', risk: 'Maintenance cost' },
};
