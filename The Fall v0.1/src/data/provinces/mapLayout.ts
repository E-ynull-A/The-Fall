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
  gullhaven: { x: 145, y: 260 },
  saltmere: { x: 205, y: 365 },
  brightwater: { x: 350, y: 530 },
  ambermoor: { x: 310, y: 285 },
  ardenhal_crown: { x: 495, y: 385 },
  thornfield: { x: 570, y: 130 },
  greenvale: { x: 570, y: 560 },
  highwatch: { x: 695, y: 350 },
  grimpass: { x: 820, y: 110 },
  ironridge: { x: 755, y: 560 },
  draven_hold: { x: 880, y: 320 },
  copperdeep: { x: 905, y: 540 },
};

/**
 * The 12-province river-delta coast, clockwise from the north-west cape.
 * Four broad estuary mouths indent the southern shore and create distinct
 * marshy peninsulas. The province seats remain safely inland.
 */
export const COASTLINE: readonly [number, number][] = [
  [180, 54], [236, 26], [310, 34], [382, 17], [450, 31], [526, 18],
  [600, 30], [676, 17], [748, 29], [818, 38], [880, 68], [927, 112],
  [958, 160], [944, 207], [969, 252], [949, 299], [965, 345], [944, 390],
  [956, 434], [940, 478], [925, 516], [910, 540], [890, 555], [875, 535],
  [860, 548], [842, 578], [825, 594], [808, 578], [793, 550], [775, 540],
  [760, 556], [748, 582], [735, 607], [716, 618], [700, 602], [686, 578],
  [670, 566], [652, 578], [638, 602], [621, 624], [602, 630], [586, 612],
  [575, 586], [558, 577], [542, 592], [526, 615], [510, 630], [492, 615],
  [478, 590], [460, 578], [442, 590], [425, 612], [407, 626], [388, 611],
  [372, 588], [354, 580], [337, 593], [320, 606], [300, 590], [282, 570],
  [262, 558], [244, 568], [226, 562], [211, 550], [178, 516], [148, 481],
  [125, 443], [105, 405], [94, 365], [107, 328], [92, 290], [103, 253],
  [111, 216], [124, 181], [128, 145], [146, 108],
];
