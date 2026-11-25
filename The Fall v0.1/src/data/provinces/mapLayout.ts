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

/**
 * Full outer coastline, clockwise from the north-west cape.
 * The 12 province seats remain inland; only the landmass silhouette changes.
 * The result is a broad, irregular island with a northern shoulder, eastern
 * headlands and a hooked south-western coast rather than a rectangular land edge.
 */
export const COASTLINE: readonly [number, number][] = [
  [180, 54], [236, 26], [310, 34], [382, 17], [450, 31], [526, 18],
  [600, 30], [676, 17], [748, 29], [818, 38], [880, 68], [927, 112],
  [958, 160], [944, 207], [969, 252], [949, 299], [965, 345], [944, 390],
  [956, 434], [940, 478], [925, 516], [908, 554], [873, 584], [835, 609],
  [790, 625], [744, 639], [698, 629], [650, 644], [604, 632], [556, 645],
  [510, 632], [462, 642], [414, 629], [367, 638], [323, 620], [283, 608],
  [245, 580], [211, 550], [178, 516], [148, 481], [125, 443], [105, 405],
  [94, 365], [107, 328], [92, 290], [103, 253], [111, 216], [124, 181],
  [128, 145], [146, 108],
];
