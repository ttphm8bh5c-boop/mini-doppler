/**
 * FMF 2019 Umbilical Artery Pulsatility Index (UA-PI) Reference Model
 *
 * Source: Ciobanu A, Wright A, Syngelaki A, Wright D, Akolekar R, Nicolaides KH.
 * Ultrasound Obstet Gynecol 2019; 53: 465–472. DOI: 10.1002/uog.20157 (Supplementary Table S1).
 * Verified in correspondence: DeVore GR. Ultrasound Obstet Gynecol 2021; 57: 349–353.
 *
 * Valid Gestational Age Range: 20+0 to 41+6 weeks (140 to 293 days).
 *
 * Mathematical Equations:
 * 1. Median UA-PI (linear function of gestational age in days):
 *    Median = 1.6473 - (0.003005 * GA_days)
 *
 * 2. Standard Deviation of log10(UA-PI) (quadratic function of GA in days):
 *    SD_log10 = 0.08713 - (0.0002936 * GA_days) + (0.0000009355 * GA_days^2)
 *
 * 3. Z-score (in log10 space):
 *    Z = (log10(measured) - log10(Median)) / SD_log10
 */

import { calculateZScore, zScoreToPercentile } from '../../clinical/statistics.js';

export const UA_COEFFICIENTS = {
  source: 'Ciobanu et al. 2019 (Table S1), DOI: 10.1002/uog.20157',
  parameter: 'Umbilical Artery Pulsatility Index (UA-PI)',
  isVerified: true,
  verificationStatus: 'Verified against publication Table S1 & DeVore 2021',
  validRangeDays: [140, 293],
  median: {
    type: 'linear',
    intercept: 1.6473,
    slope: -0.003005
  },
  sd: {
    type: 'log10_quadratic',
    intercept: 0.08713,
    linear: -0.0002936,
    quadratic: 0.0000009355
  }
};

/**
 * Calculates expected median, SD, centiles, Z-score, and percentile for UA-PI.
 * @param {number} gaDecimalWeeks - Gestational age in decimal weeks (e.g., 35.5714)
 * @returns {import('../types.js').ReferenceValueResult}
 */
export function getUAReference(gaDecimalWeeks) {
  const gaDays = gaDecimalWeeks * 7;

  // Median UA-PI (linear in days)
  const expectedMedian = UA_COEFFICIENTS.median.intercept + (UA_COEFFICIENTS.median.slope * gaDays);

  // SD of log10(UA-PI) (quadratic in days)
  const sd = UA_COEFFICIENTS.sd.intercept +
    (UA_COEFFICIENTS.sd.linear * gaDays) +
    (UA_COEFFICIENTS.sd.quadratic * gaDays * gaDays);

  // 1.644853 corresponds to 90% central reference interval (5th and 95th centiles)
  const z90 = 1.644853;
  const logMedian = Math.log10(expectedMedian);

  const centile5 = Math.pow(10, logMedian - (z90 * sd));
  const centile50 = expectedMedian;
  const centile95 = Math.pow(10, logMedian + (z90 * sd));

  return {
    expectedMedian,
    sd,
    isLogScale: true,
    isVerified: true,
    verificationStatus: 'Verified empirical coefficients from Ciobanu 2019 Table S1',
    centile5,
    centile50,
    centile95,
    calculateZScore: (measured) => calculateZScore(measured, expectedMedian, sd, true),
    calculatePercentile: (measured) => {
      const z = calculateZScore(measured, expectedMedian, sd, true);
      return zScoreToPercentile(z);
    }
  };
}
