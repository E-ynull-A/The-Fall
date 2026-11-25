import type { ProvinceId } from '../../types/province';
import { MAP_HEIGHT, MAP_WIDTH, PROVINCE_SEATS } from '../../data/provinces/mapLayout';
import { nextRandom, seedFrom } from '../../utils/random';

/**
 * Pure geometry for the atlas. Builds one polygon per province (a Voronoi cell of
 * its seat, clipped to the map frame) and records which province lies across
 * each edge. Shared borders are roughened deterministically so both provinces
 * draw the identical wobbly line.
 */

export interface Point {
  x: number;
  y: number;
}

/** A border segment of a cell. `neighbor` is null on the map frame. */
export interface CellEdge {
  from: Point;
  to: Point;
  neighbor: ProvinceId | null;
}

export interface ProvinceShape {
  id: ProvinceId;
  seat: Point;
  centroid: Point;
  edges: CellEdge[];
  /** Roughened outline, as an SVG path `d` string. */
  path: string;
}

export interface BorderSegment {
  a: ProvinceId;
  b: ProvinceId;
  /** Roughened polyline points shared by both provinces. */
  points: Point[];
}

export interface MapGeometry {
  shapes: Record<ProvinceId, ProvinceShape>;
  borders: BorderSegment[];
}

interface LabeledPolygon {
  pts: Point[];
  /** labels[i] is the neighbor across edge pts[i] → pts[i+1]. */
  labels: (ProvinceId | null)[];
}

const EPS = 1e-6;

/** Keeps the part of `poly` closer to `site` than to `other` (Sutherland–Hodgman). */
function clipByBisector(poly: LabeledPolygon, site: Point, other: Point, otherId: ProvinceId): LabeledPolygon {
  const mx = (site.x + other.x) / 2;
  const my = (site.y + other.y) / 2;
  const nx = other.x - site.x;
  const ny = other.y - site.y;
  const side = (p: Point) => (p.x - mx) * nx + (p.y - my) * ny; // <= 0 means inside

  const out: LabeledPolygon = { pts: [], labels: [] };
  const n = poly.pts.length;
  for (let i = 0; i < n; i++) {
    const cur = poly.pts[i] as Point;
    const next = poly.pts[(i + 1) % n] as Point;
    const label = poly.labels[i] ?? null;
    const sc = side(cur);
    const sn = side(next);
    const curIn = sc <= EPS;
    const nextIn = sn <= EPS;
    const intersect = (): Point => {
      const t = sc / (sc - sn);
      return { x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t };
    };
    if (curIn && nextIn) {
      out.pts.push(cur);
      out.labels.push(label);
    } else if (curIn && !nextIn) {
      out.pts.push(cur);
      out.labels.push(label);
      out.pts.push(intersect());
      out.labels.push(otherId);
    } else if (!curIn && nextIn) {
      out.pts.push(intersect());
      out.labels.push(label);
    }
  }
  return out;
}

function polygonCentroid(pts: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as Point;
    const q = pts[(i + 1) % pts.length] as Point;
    const cross = p.x * q.y - q.x * p.y;
    area += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < EPS) return pts[0] ?? { x: 0, y: 0 };
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

const round = (v: number) => Math.round(v * 100) / 100;

function pointKey(p: Point): string {
  return `${round(p.x)},${round(p.y)}`;
}

function comparePoints(a: Point, b: Point): number {
  return round(a.x) - round(b.x) || round(a.y) - round(b.y);
}

/**
 * Midpoint displacement between two points. Deterministic for a given key,
 * independent of direction (always computed in canonical order).
 */
function roughLine(p: Point, q: Point, key: string, depth = 3, roughness = 0.16): Point[] {
  const swapped = comparePoints(p, q) > 0;
  const start = swapped ? q : p;
  const end = swapped ? p : q;
  let rng = seedFrom(key);

  let pts: Point[] = [start, end];
  for (let d = 0; d < depth; d++) {
    const next: Point[] = [pts[0] as Point];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i] as Point;
      const b = pts[i + 1] as Point;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const r = nextRandom(rng);
      rng = r.state;
      const offset = (r.value - 0.5) * 2 * len * roughness;
      next.push({ x: (a.x + b.x) / 2 + (-dy / (len || 1)) * offset, y: (a.y + b.y) / 2 + (dx / (len || 1)) * offset });
      next.push(b);
    }
    pts = next;
  }
  return swapped ? pts.reverse() : pts;
}

function edgeKey(a: ProvinceId, b: ProvinceId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildMapGeometry(
  seats: Record<ProvinceId, Point> = PROVINCE_SEATS,
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
): MapGeometry {
  const ids = Object.keys(seats);
  const shapes: Record<ProvinceId, ProvinceShape> = {};
  const borders = new Map<string, BorderSegment>();

  for (const id of ids) {
    const seat = seats[id] as Point;
    let poly: LabeledPolygon = {
      pts: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      labels: [null, null, null, null],
    };
    for (const otherId of ids) {
      if (otherId === id) continue;
      poly = clipByBisector(poly, seat, seats[otherId] as Point, otherId);
    }

    const edges: CellEdge[] = [];
    for (let i = 0; i < poly.pts.length; i++) {
      const from = poly.pts[i] as Point;
      const to = poly.pts[(i + 1) % poly.pts.length] as Point;
      if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue; // drop degenerate slivers
      edges.push({ from, to, neighbor: poly.labels[i] ?? null });
    }

    // Build a roughened outline. Shared borders use the same key so both sides match.
    const outline: Point[] = [];
    for (const edge of edges) {
      const line = edge.neighbor
        ? roughLine(edge.from, edge.to, edgeKey(id, edge.neighbor))
        : [edge.from, edge.to];
      outline.push(...line.slice(0, -1));
      if (edge.neighbor) {
        const key = edgeKey(id, edge.neighbor);
        if (!borders.has(key)) {
          const [a, b] = id < edge.neighbor ? [id, edge.neighbor] : [edge.neighbor, id];
          borders.set(key, { a, b, points: line });
        }
      }
    }

    const path =
      outline.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ') + ' Z';

    shapes[id] = { id, seat, centroid: polygonCentroid(poly.pts), edges, path };
  }

  return { shapes, borders: [...borders.values()] };
}

/** Neighbor sets implied by the geometry (used to verify data consistency). */
export function geometricNeighbors(geometry: MapGeometry): Record<ProvinceId, ProvinceId[]> {
  const result: Record<ProvinceId, ProvinceId[]> = {};
  for (const shape of Object.values(geometry.shapes)) {
    const set = new Set<ProvinceId>();
    for (const e of shape.edges) if (e.neighbor) set.add(e.neighbor);
    result[shape.id] = [...set].sort();
  }
  return result;
}

export function polylineToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
}

export { pointKey };

/** Static geometry for the built-in map, computed once. */
export const MAP_GEOMETRY: MapGeometry = buildMapGeometry();
