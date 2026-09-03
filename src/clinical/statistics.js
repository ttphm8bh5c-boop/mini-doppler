/**
 * 多普勒 Z-Score 與百分位數統計計算模組
 * Statistical calculations for Doppler Z-scores and percentiles
 */

/**
 * 誤差函數近似計算（Winitzki / Abramowitz & Stegun 7.1.26）
 * 誤差小於 1.5e-7。
 * @param {number} x
 * @returns {number} erf(x)
 */
export function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1.0 - poly * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * 標準常態分佈累積機率函數 CDF N(0,1)
 * @param {number} z - Z-score
 * @returns {number} 累積機率 P(Z <= z) 在 [0, 1] 之間
 */
export function normalCDF(z) {
  if (!Number.isFinite(z)) {
    return NaN;
  }
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/**
 * 將標準常態 Z-Score 轉換為百分位數（0.00 至 100.00）。
 * @param {number} z - Z-score
 * @returns {number} 百分位數（如 5.0, 50.0, 95.0）
 */
export function zScoreToPercentile(z) {
  const cdf = normalCDF(z);
  if (Number.isNaN(cdf)) {
    return NaN;
  }
  return cdf * 100.0;
}

/**
 * 計算觀測值之 Z-Score。
 * 支援常規線性尺度與對數尺度（log10）。
 *
 * 對數尺度（FMF 2019 模型）:
 *   Z = (log10(observed) - log10(expectedMedian)) / sd
 *
 * 線性尺度:
 *   Z = (observed - expectedMedian) / sd
 *
 * @param {number} observed - 觀測數值
 * @param {number} expectedMedian - 該懷孕週數預期中位數
 * @param {number} sd - 該懷孕週數標準差
 * @param {boolean} isLog10Scale - 是否在 log10 尺度上擬合
 * @returns {number} Z-score
 */
export function calculateZScore(observed, expectedMedian, sd, isLog10Scale = false) {
  if (!Number.isFinite(observed) || !Number.isFinite(expectedMedian) || !Number.isFinite(sd)) {
    return NaN;
  }

  if (sd <= 0) {
    throw new RangeError('標準差必須大於零');
  }

  if (isLog10Scale) {
    if (observed <= 0 || expectedMedian <= 0) {
      throw new RangeError('對數轉換之數值必須大於零');
    }
    const logObserved = Math.log10(observed);
    const logMedian = Math.log10(expectedMedian);
    return (logObserved - logMedian) / sd;
  }

  return (observed - expectedMedian) / sd;
}

/**
 * 將百分位數格式化為中文臨床排版字串。
 * @param {number} percentile
 * @returns {string} 如 "第 5 百分位數", "< 第 1 百分位數" 等
 */
export function formatPercentile(percentile) {
  if (!Number.isFinite(percentile)) {
    return '—';
  }

  if (percentile < 1) {
    return '< 第 1 百分位數 (<1st centile)';
  }
  if (percentile > 99) {
    return '> 第 99 百分位數 (>99th centile)';
  }

  const rounded = Math.round(percentile * 10) / 10;
  const valStr = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return `第 ${valStr} 百分位數 (${valStr}th centile)`;
}
