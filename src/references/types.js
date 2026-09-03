/**
 * Common DopplerReferenceModel interface definition.
 *
 * Ensures future reference datasets (INTERGROWTH-21st, Baschat, etc.)
 * can be integrated without modifying UI or calculation orchestration code.
 */

/**
 * @typedef {Object} ReferenceValueResult
 * @property {number} expectedMedian - Expected median value for GA
 * @property {number} sd - Standard deviation for GA
 * @property {boolean} isLogScale - Whether the underlying statistical distribution is log-transformed
 * @property {boolean} isVerified - Whether mathematical coefficients are empirically verified from source
 * @property {string} verificationStatus - Clear clinical status note
 * @property {number} centile5 - 5th percentile value at this GA
 * @property {number} centile50 - 50th percentile (median) value at this GA
 * @property {number} centile95 - 95th percentile value at this GA
 * @property {(measured: number) => number} calculateZScore - Function to compute Z-score
 * @property {(measured: number) => number} calculatePercentile - Function to compute percentile
 */

/**
 * @typedef {Object} DopplerReferenceModel
 * @property {string} id - Unique identifier (e.g., 'fmf-2019')
 * @property {string} name - Display name
 * @property {string} source - Study author / citation
 * @property {string} doi - Publication DOI
 * @property {{
 *   minWeeks: number,
 *   minDays: number,
 *   maxWeeks: number,
 *   maxDays: number,
 *   minDecimal: number,
 *   maxDecimal: number,
 *   minTotalDays: number,
 *   maxTotalDays: number
 * }} gestationalAgeRange - Validated gestational age interval
 * @property {(gaDecimal: number) => ReferenceValueResult} getUAReference - Umbilical artery reference
 * @property {(gaDecimal: number) => ReferenceValueResult} getMCAReference - Middle cerebral artery reference
 * @property {(gaDecimal: number) => ReferenceValueResult} getCPRReference - Cerebroplacental ratio reference
 */
