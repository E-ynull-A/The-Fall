import { MAP_GEOMETRY, buildMapGeometry, geometricNeighbors } from './mapGeometry';
import { PROVINCES } from '../../data/provinces/provinces';
import { PROVINCE_SEATS } from '../../data/provinces/mapLayout';

describe('map geometry', () => {
  it('has a shape and a seat for every province', () => {
    for (const p of PROVINCES) {
      expect(PROVINCE_SEATS[p.id]).toBeDefined();
      expect(MAP_GEOMETRY.shapes[p.id]?.edges.length).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(MAP_GEOMETRY.shapes)).toHaveLength(PROVINCES.length);
  });

  it('draws borders that match the gameplay neighbor lists exactly', () => {
    const geo = geometricNeighbors(MAP_GEOMETRY);
    for (const p of PROVINCES) {
      expect({ id: p.id, neighbors: geo[p.id] }).toEqual({ id: p.id, neighbors: [...p.neighbors].sort() });
    }
  });

  it('creates one shared border per neighboring pair', () => {
    const pairs = new Set(PROVINCES.flatMap((p) => p.neighbors.map((n) => [p.id, n].sort().join('|'))));
    expect(MAP_GEOMETRY.borders).toHaveLength(pairs.size);
  });

  it('is deterministic', () => {
    const again = buildMapGeometry();
    expect(again.shapes['highwatch']?.path).toBe(MAP_GEOMETRY.shapes['highwatch']?.path);
  });

  it('places every centroid inside the map', () => {
    for (const shape of Object.values(MAP_GEOMETRY.shapes)) {
      expect(shape.centroid.x).toBeGreaterThan(0);
      expect(shape.centroid.x).toBeLessThan(1000);
      expect(shape.centroid.y).toBeGreaterThan(0);
      expect(shape.centroid.y).toBeLessThan(650);
    }
  });
});
