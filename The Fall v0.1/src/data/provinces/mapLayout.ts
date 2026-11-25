import type { ProvinceId } from '../../types/province';

/**
 * Map layout data for the atlas (Phase 2).
 * Province borders are generated from these seat positions, so moving a seat
 * reshapes the map. A test checks that the generated borders produce exactly
 * the neighbor lists in provinces.ts.
 */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 650;

/** Province seat (map coordinates, origin top-left). */
export const PROVINCE_SEATS: Record<ProvinceId, { x: number; y: number }> = {
  gullhaven: { x: 175, y: 165 },
  saltmere: { x: 175, y: 380 },
  brightwater: { x: 320, y: 500 },
  ambermoor: { x: 330, y: 235 },
  ardenhal_crown: { x: 480, y: 380 },
  thornfield: { x: 545, y: 165 },
  greenvale: { x: 545, y: 545 },
  highwatch: { x: 660, y: 340 },
  grimpass: { x: 720, y: 140 },
  ironridge: { x: 730, y: 545 },
  draven_hold: { x: 860, y: 320 },
  copperdeep: { x: 880, y: 540 },
};

/** West / south-west coastline, north to south. Land lies east of this line. */
export const COASTLINE: readonly [number, number][] = [
  [150, 0], [128, 40], [120, 85], [138, 130], [124, 175], [102, 220], [98, 262],
  [118, 305], [122, 350], [100, 392], [92, 436], [112, 478], [142, 518], [176, 556],
  [214, 588], [256, 610], [300, 626], [348, 640], [372, 650],
];
