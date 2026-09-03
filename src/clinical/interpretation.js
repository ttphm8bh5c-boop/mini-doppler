/**
 * 產科多普勒臨床判讀引擎（依據 ISUOG 指南標準）
 * Obstetric Doppler clinical interpretation engine based on ISUOG guidelines.
 *
 * 嚴格限制：僅供臨床判讀輔助，絕不提供分娩、治療或處置建議。
 */

export const THRESHOLDS = {
  CPR_ABNORMAL_CENTILE: 5.0,
  CPR_BORDERLINE_CENTILE: 10.0,
  MCA_LOW_CENTILE: 5.0,
  UA_HIGH_CENTILE: 95.0,
  UA_BORDERLINE_CENTILE: 90.0,
  HISTORICAL_CPR_THRESHOLD: 1.0
};

/**
 * 判讀腦胎盤比值（CPR）百分位數
 * 規則：< 5.00 為異常；>= 5.00 為正常（5.00–10.00 為臨界偏低）
 * @param {number|null} percentile
 * @returns {{
 *   status: 'normal'|'borderline'|'abnormal'|'unverified',
 *   statusText: string,
 *   statement: string
 * }}
 */
export function interpretCPR(percentile) {
  if (percentile === null || percentile === undefined || Number.isNaN(percentile)) {
    return {
      status: 'unverified',
      statusText: '待驗證參考數據',
      statement: 'CPR 百分位數正等待驗證之參考數據集。'
    };
  }

  if (percentile < THRESHOLDS.CPR_ABNORMAL_CENTILE) {
    return {
      status: 'abnormal',
      statusText: '異常（< 第 5 百分位數）',
      statement: '異常低 CPR（<5th centile），符合腦血流重新分佈／腦保護模式（cerebral blood-flow redistribution / brain-sparing pattern）。'
    };
  }

  if (percentile < THRESHOLDS.CPR_BORDERLINE_CENTILE) {
    return {
      status: 'borderline',
      statusText: '臨界偏低（第 5–10 百分位數）',
      statement: 'CPR 在該懷孕週數參考範圍內，屬臨界偏低（5th–10th centile）。'
    };
  }

  return {
    status: 'normal',
    statusText: '正常（≥ 第 5 百分位數）',
    statement: 'CPR 在該懷孕週數參考範圍內（CPR within gestational-age reference range）。'
  };
}

/**
 * 判讀大腦中動脈搏動指數（MCA PI）百分位數
 * 規則：< 5.00 為偏低（腦血管擴張）
 * @param {number|null} percentile
 * @returns {{
 *   status: 'normal'|'borderline'|'abnormal'|'unverified',
 *   statusText: string,
 *   statement: string
 * }}
 */
export function interpretMCA(percentile) {
  if (percentile === null || percentile === undefined || Number.isNaN(percentile)) {
    return {
      status: 'unverified',
      statusText: '待驗證參考數據',
      statement: 'MCA PI 百分位數正等待驗證之參考數據集。'
    };
  }

  if (percentile < THRESHOLDS.MCA_LOW_CENTILE) {
    return {
      status: 'abnormal',
      statusText: '偏低（< 第 5 百分位數）',
      statement: '低 MCA PI，符合腦血管擴張（Low MCA PI, consistent with cerebral vasodilatation）。'
    };
  }

  return {
    status: 'normal',
    statusText: '正常（≥ 第 5 百分位數）',
    statement: 'MCA PI 在該懷孕週數參考範圍內。'
  };
}

/**
 * 判讀臍動脈搏動指數（UA PI）百分位數
 * 規則：> 95.00 為升高（胎盤阻力增加）
 * @param {number|null} percentile
 * @returns {{
 *   status: 'normal'|'borderline'|'abnormal'|'unverified',
 *   statusText: string,
 *   statement: string
 * }}
 */
export function interpretUA(percentile) {
  if (percentile === null || percentile === undefined || Number.isNaN(percentile)) {
    return {
      status: 'unverified',
      statusText: '待驗證參考數據',
      statement: '臍動脈 PI 百分位數正等待驗證之參考數據集。'
    };
  }

  if (percentile > THRESHOLDS.UA_HIGH_CENTILE) {
    return {
      status: 'abnormal',
      statusText: '升高（> 第 95 百分位數）',
      statement: '臍動脈 PI 升高，提示胎盤血管阻力增加（Elevated umbilical artery PI, suggesting increased placental vascular resistance）。'
    };
  }

  if (percentile > THRESHOLDS.UA_BORDERLINE_CENTILE) {
    return {
      status: 'borderline',
      statusText: '臨界偏高（第 90–95 百分位數）',
      statement: '臍動脈 PI 在參考範圍內，屬臨界偏高（90th–95th centile）。'
    };
  }

  return {
    status: 'normal',
    statusText: '正常（≤ 第 95 百分位數）',
    statement: '臍動脈 PI 在該懷孕週數參考範圍內。'
  };
}

/**
 * 綜合多普勒血流判讀引擎（同時考慮 CPR、MCA PI 與 UA PI）
 *
 * 遵循 ISUOG 專家共識與指定臨床案例：
 * - 案例 A: 全部正常 -> "該懷孕週數的多普勒血流關係正常。" (Normal Doppler relationship for gestational age.)
 * - 案例 B: CPR < 5th, MCA < 5th, UA 正常 -> "異常 CPR 合併低 MCA PI，符合腦血流重新分佈／腦保護效應。" (Abnormal CPR with low MCA PI, compatible with cerebral redistribution / brain-sparing.)
 * - 案例 C: CPR < 5th, UA > 95th -> "異常 CPR 合併胎盤阻力增加。" (Abnormal CPR with increased placental resistance.)
 * - 案例 D: MCA < 5th 但 CPR >= 5th -> "檢測到 MCA PI 偏低。CPR 仍維持在參考範圍內。" (Low MCA PI detected. CPR remains within reference range.)
 * - 案例 E: CPR < 5th, MCA < 5th, UA > 95th -> "異常 CPR 合併低 MCA PI 與臍動脈 PI 升高，符合顯著腦血流重新分佈／腦保護效應與高胎盤阻力。"
 * - 案例 F: UA > 95th 但 CPR >= 5th -> "檢測到臍動脈 PI 升高。CPR 仍維持在參考範圍內。"
 *
 * @param {{
 *   cprPercentile: number|null,
 *   mcaPercentile: number|null,
 *   uaPercentile: number|null,
 *   cprValue: number
 * }} params
 * @returns {import('../types/index.js').CombinedInterpretationResult}
 */
export function interpretCombinedResults({ cprPercentile, mcaPercentile, uaPercentile, cprValue }) {
  const isCPRLow = cprPercentile !== null && !Number.isNaN(cprPercentile) && cprPercentile < THRESHOLDS.CPR_ABNORMAL_CENTILE;
  const isCPRBorderline = cprPercentile !== null && !Number.isNaN(cprPercentile) && cprPercentile >= THRESHOLDS.CPR_ABNORMAL_CENTILE && cprPercentile < THRESHOLDS.CPR_BORDERLINE_CENTILE;
  const isMCALow = mcaPercentile !== null && !Number.isNaN(mcaPercentile) && mcaPercentile < THRESHOLDS.MCA_LOW_CENTILE;
  const isUAHigh = uaPercentile !== null && !Number.isNaN(uaPercentile) && uaPercentile > THRESHOLDS.UA_HIGH_CENTILE;
  const isUABorderline = uaPercentile !== null && !Number.isNaN(uaPercentile) && uaPercentile > THRESHOLDS.UA_BORDERLINE_CENTILE && uaPercentile <= THRESHOLDS.UA_HIGH_CENTILE;

  let headline = '';
  let detail = '';
  let overallStatus = 'normal';
  let isBrainSparing = false;

  // 案例 E: 嚴重合併（低 CPR + 低 MCA + 高 UA）
  if (isCPRLow && isMCALow && isUAHigh) {
    headline = '異常 CPR 合併低 MCA PI 與臍動脈 PI 升高，符合顯著腦血流重新分佈／腦保護效應與高胎盤阻力。';
    detail = '同時存在腦血管擴張（MCA PI < 第 5 百分位數）與胎盤血管阻力升高（UA PI > 第 95 百分位數），導致腦胎盤比值顯著下降（CPR < 第 5 百分位數）。';
    overallStatus = 'abnormal';
    isBrainSparing = true;
  }
  // 案例 B: 低 CPR + 低 MCA + 正常 UA
  else if (isCPRLow && isMCALow && !isUAHigh) {
    headline = '異常 CPR 合併低 MCA PI，符合腦血流重新分佈／腦保護效應。';
    detail = '存在腦血管擴張（MCA PI < 第 5 百分位數），而臍動脈阻力正常，導致腦胎盤比值異常（CPR < 第 5 百分位數），符合腦保護血流動力學模式。';
    overallStatus = 'abnormal';
    isBrainSparing = true;
  }
  // 案例 C: 低 CPR + 高 UA
  else if (isCPRLow && isUAHigh) {
    headline = '異常 CPR 合併胎盤阻力增加。';
    detail = '臍動脈阻力升高（UA PI > 第 95 百分位數）驅動腦胎盤比值異常下降（CPR < 第 5 百分位數）。';
    overallStatus = 'abnormal';
    isBrainSparing = true;
  }
  // 單純低 CPR（MCA 與 UA 數值尚在各自範圍內）
  else if (isCPRLow) {
    headline = '異常低 CPR（< 第 5 百分位數），符合腦血流重新分佈／腦保護模式。';
    detail = '該懷孕週數的 MCA PI 與 UA PI 比值異常偏低（< 第 5 百分位數），即便單一血管搏動指數仍在個別標稱界限內。';
    overallStatus = 'abnormal';
    isBrainSparing = true;
  }
  // 案例 D: 低 MCA PI 但 CPR 正常
  else if (isMCALow && !isCPRLow) {
    headline = '檢測到 MCA PI 偏低。CPR 仍維持在參考範圍內。';
    detail = '大腦中動脈搏動指數偏低（< 第 5 百分位數），提示腦血管擴張；然而腦胎盤比值（CPR）仍維持在該懷孕週數預期的正常參考範圍內（≥ 第 5 百分位數）。';
    overallStatus = 'borderline';
    isBrainSparing = false;
  }
  // 案例 F: 臍動脈 PI 升高但 CPR 正常
  else if (isUAHigh && !isCPRLow) {
    headline = '檢測到臍動脈 PI 升高。CPR 仍維持在參考範圍內。';
    detail = '臍動脈阻力升高（> 第 95 百分位數），提示胎盤阻力增加；但腦胎盤比值（CPR）仍處於該週數正常範圍內。';
    overallStatus = 'borderline';
    isBrainSparing = false;
  }
  // 臨界數值
  else if (isCPRBorderline || isUABorderline) {
    headline = '該懷孕週數的多普勒血流指標處於臨界值。';
    detail = isCPRBorderline
      ? '腦胎盤比值處於臨界偏低區間（第 5–10 百分位數），各項指標仍在正常界限之內。'
      : '臍動脈 PI 處於臨界偏高區間（第 90–95 百分位數），腦胎盤比值維持正常。';
    overallStatus = 'borderline';
    isBrainSparing = false;
  }
  // 案例 A: 全部正常
  else {
    headline = '該懷孕週數的多普勒血流關係正常。';
    detail = '大腦中動脈 PI、臍動脈 PI 以及腦胎盤比值（CPR）均在預期的懷孕週數正常參考範圍內。';
    overallStatus = 'normal';
    isBrainSparing = false;
  }

  // 歷史 CPR < 1.0 說明
  const historicalCprNote = cprValue < THRESHOLDS.HISTORICAL_CPR_THRESHOLD
    ? `歷史門檻值檢查：計算之 CPR (${cprValue.toFixed(2)}) < 1.0。注意：固定值 CPR < 1.0 為早期歷史門檻；現行 ISUOG 指南明確建議應以特定懷孕週數百分位數（< 第 5 百分位數）為臨床主要依據。`
    : `歷史門檻值檢查：計算之 CPR (${cprValue.toFixed(2)}) ≥ 1.0。臨床判讀必須優先依據特定懷孕週數百分位數（< 第 5 百分位數），而非僅依賴固定的 1.0 臨界值。`;

  return {
    headline,
    detail,
    overallStatus,
    isBrainSparing,
    historicalCprNote
  };
}
