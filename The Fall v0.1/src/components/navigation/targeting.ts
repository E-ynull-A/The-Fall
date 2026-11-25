import type { ProvinceId } from '../../types/province';

/**
 * A pending operation that needs a province chosen on the map.
 * Pure UI state: `confirm` dispatches an existing game action.
 */
export interface Targeting {
  /** English key of the operation, e.g. "Develop infrastructure". */
  label: string;
  validIds: ProvinceId[];
  /** Cost/effect summary for a candidate province (already translated). */
  describe: (id: ProvinceId) => string;
  confirm: (id: ProvinceId) => void;
}

export type StartTargeting = (t: Targeting) => void;
