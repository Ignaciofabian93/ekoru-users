/** Mean Earth radius, in km. */
const EARTH_RADIUS_KM = 6371;

/** Km per degree of latitude (and of longitude at the equator). */
const KM_PER_DEGREE = 111.32;

export type GeoPoint = { latitude: number; longitude: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle (haversine) distance between two points, in km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The latitude/longitude box that holds every point within `radiusKm` of
 * `origin`. A cheap index-friendly prefilter: the box over-selects at its
 * corners, so callers still check `distanceKm`. Does not wrap the
 * antimeridian, which no market we serve straddles.
 */
export function boundingBox(origin: GeoPoint, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEGREE;
  // Longitude degrees shrink towards the poles; the floor keeps the division
  // finite right at them.
  const lngDelta =
    radiusKm /
    (KM_PER_DEGREE * Math.max(Math.cos(toRadians(origin.latitude)), 0.01));
  return {
    latitude: {
      gte: origin.latitude - latDelta,
      lte: origin.latitude + latDelta,
    },
    longitude: {
      gte: origin.longitude - lngDelta,
      lte: origin.longitude + lngDelta,
    },
  };
}

/** A real coordinate pair, or null when either half is missing or off-globe. */
export function asGeoPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): GeoPoint | null {
  if (latitude == null || longitude == null) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
