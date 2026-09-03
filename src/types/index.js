/**
 * Clinical data structures and typedefs for Obstetric Doppler & CPR Calculator
 */

/**
 * @typedef {Object} GestationalAge
 * @property {number} weeks - Full gestational weeks (integer >= 0)
 * @property {number} days - Additional gestational days (0 to 6)
 * @property {number} decimalWeeks - Decimal gestational weeks (weeks + days / 7)
 * @property {number} totalDays - Gestational age in days (weeks * 7 + days)
 */

/**
 * @typedef {Object} DopplerInputs
 * @property {number} weeks - Gestational weeks
 * @property {number} days - Gestational days
 * @property {number} mcaPI - Middle Cerebral Artery Pulsatility Index
 * @property {number} uaPI - Umbilical Artery Pulsatility Index
 */

/**
 * @typedef {Object} ParameterEvaluation
 * @property {number} measuredValue - Observed measurement value
 * @property {number|null} expectedMedian - Expected median for gestational age
 * @property {number|null} zScore - Standardized Z-score
 * @property {number|null} percentile - Centile (0.0 to 100.0)
 * @property {boolean} isVerified - Whether mathematical coefficients are fully verified
 * @property {string} verificationStatus - Verification description
 * @property {'normal'|'borderline'|'abnormal'|'unverified'} status - Visual clinical status
 * @property {string} interpretation - Clinical statement for this parameter
 */

/**
 * @typedef {Object} CombinedInterpretationResult
 * @property {string} headline - Primary clinical conclusion
 * @property {string} detail - Detailed pathophysiological description
 * @property {'normal'|'borderline'|'abnormal'} overallStatus - Highest-severity visual status
 * @property {boolean} isBrainSparing - Whether findings are consistent with brain-sparing redistribution
 * @property {string} historicalCprNote - Clarification on historical CPR < 1.0 threshold
 */
