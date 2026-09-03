/**
 * 懷孕週數轉換與臨床驗證模組
 * Gestational Age conversion and clinical range validation
 */

export const MIN_GA_WEEKS = 20;
export const MIN_GA_DAYS = 0;
export const MAX_GA_WEEKS = 41;
export const MAX_GA_DAYS = 6;

export const MIN_GA_TOTAL_DAYS = MIN_GA_WEEKS * 7 + MIN_GA_DAYS; // 140
export const MAX_GA_TOTAL_DAYS = MAX_GA_WEEKS * 7 + MAX_GA_DAYS; // 293

export const MIN_GA_DECIMAL = MIN_GA_WEEKS + MIN_GA_DAYS / 7; // 20.0
export const MAX_GA_DECIMAL = MAX_GA_WEEKS + MAX_GA_DAYS / 7; // 41.857142857142854

/**
 * 將週數和天數轉換為十進制週數：GA_decimal = weeks + days / 7
 * @param {number} weeks - 完整週數（整數）
 * @param {number} days - 附加天數（0 至 6）
 * @returns {number} 十進制懷孕週數
 */
export function gestationalAgeToDecimal(weeks, days = 0) {
  const w = Number(weeks);
  const d = Number(days);

  if (!Number.isFinite(w) || !Number.isFinite(d)) {
    throw new TypeError('懷孕週數與天數必須為有效有限數值');
  }

  return w + (d / 7);
}

/**
 * 將懷孕週數轉換為總天數
 * @param {number} weeks
 * @param {number} days
 * @returns {number} 總天數
 */
export function gestationalAgeToDays(weeks, days = 0) {
  const w = Number(weeks);
  const d = Number(days);
  return (w * 7) + d;
}

/**
 * 驗證懷孕週數輸入並確認是否落於驗證之參考區間（20+0 至 41+6 週）。
 * @param {number|string} weeksInput
 * @param {number|string} daysInput
 * @returns {{
 *   isValid: boolean,
 *   isWithinRange: boolean,
 *   weeks: number,
 *   days: number,
 *   decimalWeeks: number,
 *   totalDays: number,
 *   error?: string,
 *   warning?: string
 * }}
 */
export function validateGestationalAge(weeksInput, daysInput = 0) {
  if (weeksInput === '' || weeksInput === null || weeksInput === undefined) {
    return {
      isValid: false,
      isWithinRange: false,
      weeks: NaN,
      days: NaN,
      decimalWeeks: NaN,
      totalDays: NaN,
      error: '請輸入懷孕週數。'
    };
  }

  const weeks = Number(weeksInput);
  const days = daysInput === '' || daysInput === null || daysInput === undefined ? 0 : Number(daysInput);

  if (!Number.isInteger(weeks)) {
    return {
      isValid: false,
      isWithinRange: false,
      weeks,
      days,
      decimalWeeks: NaN,
      totalDays: NaN,
      error: '懷孕週數必須為整數。'
    };
  }

  if (weeks < 0) {
    return {
      isValid: false,
      isWithinRange: false,
      weeks,
      days,
      decimalWeeks: NaN,
      totalDays: NaN,
      error: '懷孕週數不可為負數。'
    };
  }

  if (!Number.isInteger(days) || days < 0 || days > 6) {
    return {
      isValid: false,
      isWithinRange: false,
      weeks,
      days,
      decimalWeeks: NaN,
      totalDays: NaN,
      error: '天數必須為 0 至 6 之間的整數。'
    };
  }

  const totalDays = (weeks * 7) + days;
  const decimalWeeks = weeks + (days / 7);

  if (totalDays < MIN_GA_TOTAL_DAYS || totalDays > MAX_GA_TOTAL_DAYS) {
    return {
      isValid: true,
      isWithinRange: false,
      weeks,
      days,
      decimalWeeks,
      totalDays,
      warning: `懷孕週數（${weeks}+${days} 週）超出 FMF 驗證參考範圍（20+0 至 41+6 週）。參考百分位數可能不精確或無法計算。`
    };
  }

  return {
    isValid: true,
    isWithinRange: true,
    weeks,
    days,
    decimalWeeks,
    totalDays
  };
}
