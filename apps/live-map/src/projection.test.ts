import { MAP_BOUNDS } from '@fleet/api';
import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH, project } from './projection';

describe('project', () => {
  it('maps the corners of the operating area to the corners of the canvas', () => {
    expect(project(MAP_BOUNDS.maxLat, MAP_BOUNDS.minLng)).toEqual({ x: 0, y: 0 });
    const bottomRight = project(MAP_BOUNDS.minLat, MAP_BOUNDS.maxLng);
    expect(bottomRight.x).toBeCloseTo(MAP_WIDTH);
    expect(bottomRight.y).toBeCloseTo(MAP_HEIGHT);
  });

  it('keeps the area wider than it is tall at this latitude', () => {
    expect(MAP_HEIGHT).toBeLessThan(MAP_WIDTH);
  });
});
