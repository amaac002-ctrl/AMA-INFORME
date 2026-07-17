import { describe, it, expect } from 'vitest';
import { PROTECTED_SPACES_GEOJSON } from '@/src/constants/geoData';

describe('PROTECTED_SPACES_GEOJSON', () => {
  it('is a valid GeoJSON FeatureCollection', () => {
    expect(PROTECTED_SPACES_GEOJSON.type).toBe('FeatureCollection');
    expect(Array.isArray(PROTECTED_SPACES_GEOJSON.features)).toBe(true);
    expect(PROTECTED_SPACES_GEOJSON.features.length).toBeGreaterThan(0);
  });

  it('has every feature typed as Feature with a Polygon geometry', () => {
    for (const feature of PROTECTED_SPACES_GEOJSON.features) {
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Polygon');
    }
  });

  it('gives every feature a non-empty name and type', () => {
    for (const feature of PROTECTED_SPACES_GEOJSON.features) {
      expect(typeof feature.properties.name).toBe('string');
      expect(feature.properties.name.length).toBeGreaterThan(0);
      expect(typeof feature.properties.type).toBe('string');
      expect(feature.properties.type.length).toBeGreaterThan(0);
    }
  });

  it('has unique feature names', () => {
    const names = PROTECTED_SPACES_GEOJSON.features.map((f) => f.properties.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('defines closed polygon rings with valid La Palma coordinates', () => {
    for (const feature of PROTECTED_SPACES_GEOJSON.features) {
      const rings = feature.geometry.coordinates;
      expect(Array.isArray(rings)).toBe(true);
      for (const ring of rings) {
        // A closed ring needs at least 4 positions (first === last).
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        for (const [lng, lat] of ring) {
          // Roughly the bounding box of the island of La Palma.
          expect(lng).toBeGreaterThanOrEqual(-18);
          expect(lng).toBeLessThanOrEqual(-17);
          expect(lat).toBeGreaterThanOrEqual(28);
          expect(lat).toBeLessThanOrEqual(29);
        }
      }
    }
  });
});
