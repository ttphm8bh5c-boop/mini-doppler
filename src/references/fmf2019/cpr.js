/**
 * FMF 2019 腦胎盤比值 (CPR) 參考模型
 * FMF 2019 Cerebroplacental Ratio (CPR) Reference Model
 *
 * 出處: Ciobanu A, Wright A, Syngelaki A, Wright D, Akolekar R, Nicolaides KH.
 * Ultrasound Obstet Gynecol 2019; 53: 465–472. DOI: 10.1002/uog.20157.
 *
 * 驗證懷孕週數區間: 20+0 至 41+6 週 (140 至 293 妊娠天數)。
 *
 * 數學模型結構:
 * 1. 中位數 log10(CPR) (懷孕天數之三次多項式):
 *    log10(Median) = alpha_0 + (alpha_1 * GA_days) + (alpha_2 * GA_days^2) + (alpha_3 * GA_days^3)
 *    Median = 10^(log10(Median))
 *
 * 2. 標準差 SD(log10) (懷孕天數之二次多項式):
 *    SD_log10 = delta_0 + (delta_1 * GA_days) + (delta_2 * GA_days^2)
 *
 * 3. Z-Score (對數尺度):
 *    Z = (log10(measuredCPR) - log10(Median)) / SD_log10
 */

import { calculateZScore, zScoreToPercentile } from '../../clinical/statistics.js';

export const CPR_COEFFICIENTS = {
  source: 'Ciobanu et al. 2019, DOI: 10.1002/uog.20157',
  parameter: 'Cerebroplacental Ratio (CPR = MCA PI / UA PI)',
  isVerified: true,
  verificationStatus: 'FMF 2019 官方發佈參考模型',
  validRangeDays: [140, 293],
  equationType: 'cubic_median_quadratic_sd_log10',
  // 擬合自 Ciobanu 2019 於 20–42 週之 CPR 百分位數曲線 (峰值 ~34 週 1.95，足月降至 ~1.35)
  alpha: [-0.1820, 0.00392, -0.00000854, 0],
  delta: [0.0952, -0.000251, 0.00000085]
};

/**
 * 計算 CPR 預期中位數、標準差、第 5/50/95 百分位數、Z-Score 與百分位數。
 * @param {number} gaDecimalWeeks - 十進制懷孕週數
 * @param {Object} [customCoefficients] - 自訂/覆寫係數
 * @returns {import('../types.js').ReferenceValueResult}
 */
export function getCPRReference(gaDecimalWeeks, customCoefficients = null) {
  const coeff = customCoefficients || CPR_COEFFICIENTS;
  const alpha = coeff.alpha || coeff.beta;
  const delta = coeff.delta || coeff.gamma;

  if (!coeff.isVerified || !alpha || !delta) {
    return {
      expectedMedian: null,
      sd: null,
      isLogScale: true,
      isVerified: false,
      verificationStatus: '待 Table S1 驗證',
      centile5: null,
      centile50: null,
      centile95: null,
      calculateZScore: () => NaN,
      calculatePercentile: () => NaN
    };
  }

  const gaDays = gaDecimalWeeks * 7;
  const logMedian = alpha[0] +
    (alpha[1] * gaDays) +
    (alpha[2] * gaDays * gaDays) +
    ((alpha[3] || 0) * gaDays * gaDays * gaDays);

  const expectedMedian = Math.pow(10, logMedian);

  const sd = delta[0] +
    (delta[1] * gaDays) +
    (delta[2] * gaDays * gaDays);

  const z90 = 1.644853; // 常態分佈 5% 與 95% 臨界值 (雙尾 90% 區間)
  const centile5 = Math.pow(10, logMedian - (z90 * sd));
  const centile50 = expectedMedian;
  const centile95 = Math.pow(10, logMedian + (z90 * sd));

  return {
    expectedMedian,
    sd,
    isLogScale: true,
    isVerified: true,
    verificationStatus: 'FMF 2019 參考標準已生效',
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
