import { MAP_BOUNDS } from '@fleet/api';

const latSpan = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
const lngSpan = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
const midLatRadians = (((MAP_BOUNDS.maxLat + MAP_BOUNDS.minLat) / 2) * Math.PI) / 180;

export const MAP_WIDTH = 1000;
// A degree of longitude is shorter than a degree of latitude away from the equator, so the
// canvas is shaped to the area instead of stretching it into a square.
export const MAP_HEIGHT = Math.round((MAP_WIDTH * latSpan) / (lngSpan * Math.cos(midLatRadians)));

/** Equirectangular projection of the operating area onto the SVG canvas. */
export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - MAP_BOUNDS.minLng) / lngSpan) * MAP_WIDTH,
    y: ((MAP_BOUNDS.maxLat - lat) / latSpan) * MAP_HEIGHT,
  };
}
