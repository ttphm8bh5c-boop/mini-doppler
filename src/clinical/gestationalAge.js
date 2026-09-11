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

/**
 * 檢查西曆年份是否為閏年
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 嚴格驗證西曆日期真實性（徹底攔截 2月30日、4月31日等不存在日期）
 * @param {number} year
 * @param {number} month - 1 至 12
 * @param {number} day - 1 至 31
 * @returns {boolean}
 */
export function validateCalendarDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const daysInMonth = [31, (isLeapYear(y) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= daysInMonth[m - 1];
}

/**
 * 嚴格解析日期字串，支援常見臨床日期格式並阻擋任何不存在之日期（如 2月30日）
 * 支援格式：
 * - 西曆完整：YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - 8 碼純數字：YYYYMMDD (如 20261120)
 * - 簡易月日：MM/DD, MM-DD (如 11/20，依參考年份自動推算)
 * - 民國年格式：YYY/MM/DD, YYY-MM-DD (如 115/11/20)
 * @param {string} dateStr
 * @param {Date} [referenceDate]
 * @returns {Date|null}
 */
export function parseStrictDate(dateStr, referenceDate = null) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  const now = referenceDate instanceof Date ? referenceDate : new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  // 1. 民國年格式：115/11/20 或 115-11-20
  const mTw = s.match(/^(\d{2,3})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (mTw && parseInt(mTw[1], 10) < 1900) {
    const yTw = parseInt(mTw[1], 10);
    const fullYear = yTw > 50 ? (yTw + 1911) : (yTw + 2000);
    const mVal = parseInt(mTw[2], 10);
    const dVal = parseInt(mTw[3], 10);
    if (!validateCalendarDate(fullYear, mVal, dVal)) return null;
    return new Date(fullYear, mVal - 1, dVal, 12, 0, 0);
  }

  // 2. 純 8 碼數字 YYYYMMDD (例如 20261120)
  const m8 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m8) {
    const y = parseInt(m8[1], 10);
    const mVal = parseInt(m8[2], 10);
    const dVal = parseInt(m8[3], 10);
    if (!validateCalendarDate(y, mVal, dVal)) return null;
    return new Date(y, mVal - 1, dVal, 12, 0, 0);
  }

  // 3. 常見完整西曆 YYYY[-/.]MM[-/.]DD (例如 2026-11-20, 2026/11/20, 2026.11.20)
  const mFull = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (mFull) {
    const y = parseInt(mFull[1], 10);
    const mVal = parseInt(mFull[2], 10);
    const dVal = parseInt(mFull[3], 10);
    if (!validateCalendarDate(y, mVal, dVal)) return null;
    return new Date(y, mVal - 1, dVal, 12, 0, 0);
  }

  // 4. 簡易月份/日期 MM/DD 或 MM-DD (例如 11/20 或 02/15)
  const mShort = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (mShort) {
    const mVal = parseInt(mShort[1], 10);
    const dVal = parseInt(mShort[2], 10);
    // 若月份比當前測量月份小，代表預產期在次年
    const targetYear = (mVal >= curMonth) ? curYear : (curYear + 1);
    if (!validateCalendarDate(targetYear, mVal, dVal)) return null;
    return new Date(targetYear, mVal - 1, dVal, 12, 0, 0);
  }

  return null;
}

/**
 * 依據預產期 (EDD) 與量測日期嚴格計算懷孕週數
 * 公式：以預產期當日為 40週+0天 (280天)
 * @param {string} eddStr
 * @param {string} measureDateStr
 * @returns {{
 *   isValid: boolean,
 *   isWithinRange?: boolean,
 *   weeks?: number,
 *   days?: number,
 *   gaDays?: number,
 *   error?: string,
 *   warning?: string
 * }}
 */
export function calculateGAFromEDD(eddStr, measureDateStr) {
  const measure = parseStrictDate(measureDateStr);
  const edd = parseStrictDate(eddStr, measure);
  if (!edd) {
    return { isValid: false, error: '預產期格式無效或包含不存在日期（如 2月30日）' };
  }
  if (!measure) {
    return { isValid: false, error: '量測日期格式無效或包含不存在日期' };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((edd.getTime() - measure.getTime()) / msPerDay);
  const gaDays = 280 - diffDays;

  if (gaDays < 28 || gaDays > 315) {
    return {
      isValid: false,
      error: `推算妊娠天數為 ${gaDays} 天 (${Math.floor(gaDays/7)}週)，超出生理懷孕週期範圍。`
    };
  }

  const weeks = Math.floor(gaDays / 7);
  const days = gaDays % 7;
  const isWithinRange = gaDays >= MIN_GA_TOTAL_DAYS && gaDays <= MAX_GA_TOTAL_DAYS;

  return {
    isValid: true,
    isWithinRange,
    weeks,
    days,
    gaDays,
    warning: isWithinRange ? undefined : `推算週數為 ${weeks}+${days} 週，超出 FMF 驗證參考範圍 (20+0 至 41+6 週)。`
  };
}
