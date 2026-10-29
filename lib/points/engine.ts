export type WorkType = string;

export interface PointRuleConfig {
  id?: string;
  rule_version?: string;
  work_type: string;
  rate_unit: string;
  base_points_per_unit: number | string;
  late_night_eligible: boolean;
  late_night_bonus_points: number | string;
  out_of_station_eligible: boolean;
  out_of_station_bonus_points: number | string;
  is_active?: boolean;
}

export interface CalculationInput {
  workType: WorkType;
  quantityOrDuration: number;
  isLateNight: boolean;
  isOutOfStation: boolean;
  isRework?: boolean;
}

export interface CalculationResult {
  ruleVersion: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  isLateNightApplied: boolean;
  isOutOfStationApplied: boolean;
  calculationSnapshot: {
    workType: WorkType;
    quantityOrDuration: number;
    baseRate: number;
    unit: string;
    isLateNight: boolean;
    lateNightBonus: number;
    isOutOfStation: boolean;
    outOfStationBonus: number;
    isRework: boolean;
    formula: string;
  };
}

export const CURRENT_RULE_VERSION = '1.0';

export function calculateWorkPoints(
  input: CalculationInput,
  customRule?: PointRuleConfig | null
): CalculationResult {
  const {
    workType,
    quantityOrDuration = 1,
    isLateNight = false,
    isOutOfStation = false,
    isRework = false,
  } = input;

  const version = customRule?.rule_version || CURRENT_RULE_VERSION;

  // Rule 0: Rework due to editing mistakes earns 0 points
  if (isRework) {
    return {
      ruleVersion: version,
      basePoints: 0,
      bonusPoints: 0,
      totalPoints: 0,
      isLateNightApplied: false,
      isOutOfStationApplied: false,
      calculationSnapshot: {
        workType,
        quantityOrDuration,
        baseRate: 0,
        unit: 'rework',
        isLateNight: false,
        lateNightBonus: 0,
        isOutOfStation: false,
        outOfStationBonus: 0,
        isRework: true,
        formula: '0 (Rework mistake)',
      },
    };
  }

  let baseRate = 0;
  let unit = 'event';
  let lateNightEligible = false;
  let lateNightBonusRate = 10.0;
  let outOfStationEligible = false;
  let outOfStationBonusRate = 10.0;

  if (customRule) {
    baseRate = parseFloat(String(customRule.base_points_per_unit)) || 0;
    unit = customRule.rate_unit || 'event';
    lateNightEligible = Boolean(customRule.late_night_eligible);
    lateNightBonusRate = parseFloat(String(customRule.late_night_bonus_points)) || 0;
    outOfStationEligible = Boolean(customRule.out_of_station_eligible);
    outOfStationBonusRate = parseFloat(String(customRule.out_of_station_bonus_points)) || 0;
  } else {
    // Default fallback baseline rules
    switch (workType) {
      case 'Album Photo Edit':
        baseRate = 1.0;
        unit = 'sheet';
        lateNightEligible = false;
        outOfStationEligible = false;
        break;

      case 'Video Edit':
        baseRate = 10.0;
        unit = 'hour';
        lateNightEligible = false;
        outOfStationEligible = false;
        break;

      case 'Engagement Shoot':
        baseRate = 10.0;
        unit = 'event';
        lateNightEligible = false;
        outOfStationEligible = true;
        break;

      case 'Pre-Wedding Shoot':
        baseRate = 20.0;
        unit = 'event';
        lateNightEligible = false;
        outOfStationEligible = true;
        break;

      case 'Wedding Shoot':
        baseRate = 20.0;
        unit = 'event';
        lateNightEligible = true; // Late night strictly applies to Wedding Shoot by default
        outOfStationEligible = true;
        break;

      case 'Birthday / Small Event Shoot':
        baseRate = 10.0;
        unit = 'event';
        lateNightEligible = false;
        outOfStationEligible = true;
        break;

      case 'Other':
      default:
        baseRate = 0.0;
        unit = 'custom';
        lateNightEligible = false;
        outOfStationEligible = false;
        break;
    }
  }

  // Base points calculation:
  // For sheets and hours, multiply rate * quantityOrDuration. For single events, baseRate * qty
  const qty = Math.max(0, Number(quantityOrDuration) || 0);
  const basePoints = Math.round(baseRate * qty * 100) / 100;

  // Bonus points:
  let lateNightBonus = 0;
  let outOfStationBonus = 0;

  if (lateNightEligible && isLateNight) {
    lateNightBonus = lateNightBonusRate;
  }

  if (outOfStationEligible && isOutOfStation) {
    outOfStationBonus = outOfStationBonusRate;
  }

  const bonusPoints = lateNightBonus + outOfStationBonus;
  const totalPoints = basePoints + bonusPoints;

  const formulaParts: string[] = [];
  if (unit === 'sheet') {
    formulaParts.push(`${qty} sheets × ${baseRate} pt/sheet = ${basePoints}`);
  } else if (unit === 'hour') {
    formulaParts.push(`${qty} hrs × ${baseRate} pts/hr = ${basePoints}`);
  } else {
    formulaParts.push(`Base: ${basePoints} pts (${qty} ${unit})`);
  }

  if (lateNightBonus > 0) formulaParts.push(`+ Late Night Bonus: ${lateNightBonus} pts`);
  if (outOfStationBonus > 0) formulaParts.push(`+ Out of Station Bonus: ${outOfStationBonus} pts`);

  return {
    ruleVersion: version,
    basePoints,
    bonusPoints,
    totalPoints,
    isLateNightApplied: lateNightBonus > 0,
    isOutOfStationApplied: outOfStationBonus > 0,
    calculationSnapshot: {
      workType,
      quantityOrDuration: qty,
      baseRate,
      unit,
      isLateNight,
      lateNightBonus,
      isOutOfStation,
      outOfStationBonus,
      isRework,
      formula: formulaParts.join(' ') + ` = ${totalPoints} pts`,
    },
  };
}
