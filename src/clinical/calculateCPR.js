/**
 * 胎兒腦胎盤比值（CPR）計算模組
 * Fetal Cerebroplacental Ratio (CPR) calculation
 *
 * CPR = MCA PI / UA PI
 *
 * 臨床標準：計算時保留 64 位元完整浮點精度，界面顯示時四捨五入至小數點後 2 位。
 */

/**
 * 根據 MCA PI 與 UA PI 計算腦胎盤比值（CPR）。
 * @param {number|string} mcaPI - 大腦中動脈搏動指數
 * @param {number|string} uaPI - 臍動脈搏動指數
 * @returns {number} 完整浮點精度之 CPR 數值
 * @throws {TypeError|RangeError} 當輸入值無效、非正數或非數值時拋出錯誤
 */
export function calculateCPR(mcaPI, uaPI) {
  if (mcaPI === '' || mcaPI === null || mcaPI === undefined) {
    throw new TypeError('大腦中動脈 PI (MCA PI) 為必填項目');
  }
  if (uaPI === '' || uaPI === null || uaPI === undefined) {
    throw new TypeError('臍動脈 PI (UA PI) 為必填項目');
  }

  const mca = Number(mcaPI);
  const ua = Number(uaPI);

  if (!Number.isFinite(mca)) {
    throw new TypeError('MCA PI 必須為有效數值');
  }
  if (!Number.isFinite(ua)) {
    throw new TypeError('UA PI 必須為有效數值');
  }

  if (mca <= 0) {
    throw new RangeError('MCA PI 必須大於零');
  }
  if (ua <= 0) {
    throw new RangeError('UA PI 必須大於零（不允許除以零或負數數值）');
  }

  return mca / ua;
}

/**
 * 將 CPR 數值格式化為臨床顯示字串（固定小數點後 2 位）。
 * @param {number} cpr - CPR 原始數值
 * @returns {string} 格式化字串（如 "1.25"）
 */
export function formatCPRForDisplay(cpr) {
  if (!Number.isFinite(cpr)) {
    return '—';
  }
  return cpr.toFixed(2);
}

/**
 * 驗證多普勒 PI 輸入值並回傳臨床使用者友善訊息。
 * @param {number|string} mcaPI
 * @param {number|string} uaPI
 * @returns {{
 *   isValid: boolean,
 *   mcaPI: number,
 *   uaPI: number,
 *   errors: { mcaPI?: string, uaPI?: string }
 * }}
 */
export function validateDopplerInputs(mcaPI, uaPI) {
  const errors = {};
  let mca = NaN;
  let ua = NaN;

  if (mcaPI === '' || mcaPI === null || mcaPI === undefined) {
    errors.mcaPI = '請輸入 MCA PI（大腦中動脈 PI）。';
  } else {
    mca = Number(mcaPI);
    if (!Number.isFinite(mca)) {
      errors.mcaPI = 'MCA PI 必須為有效數字。';
    } else if (mca <= 0) {
      errors.mcaPI = 'MCA PI 必須大於 0。';
    }
  }

  if (uaPI === '' || uaPI === null || uaPI === undefined) {
    errors.uaPI = '請輸入 UA PI（臍動脈 PI）。';
  } else {
    ua = Number(uaPI);
    if (!Number.isFinite(ua)) {
      errors.uaPI = 'UA PI 必須為有效數字。';
    } else if (ua <= 0) {
      errors.uaPI = 'UA PI 必須大於 0（不允許除以零）。';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    mcaPI: mca,
    uaPI: ua,
    errors
  };
}
