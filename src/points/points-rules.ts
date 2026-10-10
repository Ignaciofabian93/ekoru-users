/**
 * The points rule for one activity, as stored in `PointsByTransactionKind`.
 * See docs/POINTS.md for the values and why.
 */
export interface PointsRule {
  pointsAwarded: number;
  pointsPerKgCo2: number;
  pointsPerCubicMeterWater: number;
  maxImpactPoints: number | null;
}

/** What an activity saved, when it moved a physical item. */
export interface ActivityImpact {
  co2SavingsKG?: number | null;
  waterSavingsLT?: number | null;
}

export interface ComputedPoints {
  basePoints: number;
  impactPoints: number;
  points: number;
}

/** Zero-point rule for an activity nobody configured yet. */
export const EMPTY_RULE: PointsRule = {
  pointsAwarded: 0,
  pointsPerKgCo2: 0,
  pointsPerCubicMeterWater: 0,
  maxImpactPoints: null,
};

const nonNegative = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

/**
 * Base points for doing the activity, plus impact points for what it saved:
 * CO2 kg x pointsPerKgCo2 + water m3 x pointsPerCubicMeterWater, rounded and
 * capped at maxImpactPoints. Points match what the activity achieved: a sofa
 * kept in use earns more than a T-shirt.
 */
export function computePoints(
  rule: PointsRule,
  impact: ActivityImpact = {},
): ComputedPoints {
  const basePoints = Math.max(0, Math.round(rule.pointsAwarded));
  const co2 = nonNegative(impact.co2SavingsKG);
  const waterM3 = nonNegative(impact.waterSavingsLT) / 1000;
  let impactPoints = Math.round(
    co2 * nonNegative(rule.pointsPerKgCo2) +
      waterM3 * nonNegative(rule.pointsPerCubicMeterWater),
  );
  if (rule.maxImpactPoints != null && rule.maxImpactPoints >= 0) {
    impactPoints = Math.min(impactPoints, rule.maxImpactPoints);
  }
  return { basePoints, impactPoints, points: basePoints + impactPoints };
}
