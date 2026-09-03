/**
 * 產科多普勒全面臨床單元測試定義
 */

import { gestationalAgeToDecimal, gestationalAgeToDays, validateGestationalAge } from '../clinical/gestationalAge.js';
import { calculateCPR, formatCPRForDisplay, validateDopplerInputs } from '../clinical/calculateCPR.js';
import { normalCDF, zScoreToPercentile, calculateZScore, formatPercentile } from '../clinical/statistics.js';
import { interpretCPR, interpretMCA, interpretUA, interpretCombinedResults } from '../clinical/interpretation.js';
import { fmf2019ReferenceModel } from '../references/fmf2019/index.js';

export function runTests(assert) {
  // ==========================================
  // 1. 懷孕週數轉換與驗證 (GESTATIONAL AGE)
  // ==========================================

  assert.describe('懷孕週數數值轉換 (Gestational Age Conversion)', () => {
    assert.equal(
      gestationalAgeToDecimal(35, 4),
      35 + 4 / 7,
      '35 週 4 天正確轉換為 35.5714... 十進制週數'
    );
    assert.equal(
      gestationalAgeToDecimal(20, 0),
      20.0,
      '20 週 0 天正確轉換為 20.0 十進制週數'
    );
    assert.equal(
      gestationalAgeToDecimal(41, 6),
      41 + 6 / 7,
      '41 週 6 天正確轉換為 41.8571... 十進制週數'
    );
    assert.equal(
      gestationalAgeToDays(35, 4),
      249,
      '35 週 4 天正確計算為 249 妊娠天數'
    );
    assert.equal(
      gestationalAgeToDays(20, 0),
      140,
      '20 週 0 天正確計算為 140 妊娠天數 (FMF 最小驗證界限)'
    );
    assert.equal(
      gestationalAgeToDays(41, 6),
      293,
      '41 週 6 天正確計算為 293 妊娠天數 (FMF 最大驗證界限)'
    );
  });

  assert.describe('懷孕週數格式驗證與邊界檢查 (Validation & Boundaries)', () => {
    // 正常區間
    const validCase = validateGestationalAge(35, 4);
    assert.isTrue(validCase.isValid, '35+4 週格式合法');
    assert.isTrue(validCase.isWithinRange, '35+4 週落於驗證參考區間內');

    const minBoundary = validateGestationalAge(20, 0);
    assert.isTrue(minBoundary.isValid, '20+0 週格式合法');
    assert.isTrue(minBoundary.isWithinRange, '20+0 週剛好為下限邊界');

    const maxBoundary = validateGestationalAge(41, 6);
    assert.isTrue(maxBoundary.isValid, '41+6 週格式合法');
    assert.isTrue(maxBoundary.isWithinRange, '41+6 週剛好為上限邊界');

    // 超出驗證範圍警告 (<20+0 或 >41+6)
    const tooEarly = validateGestationalAge(18, 0);
    assert.isTrue(tooEarly.isValid, '18+0 週結構上為有效輸入');
    assert.isFalse(tooEarly.isWithinRange, '18+0 週超出 FMF 驗證參考範圍');
    assert.isTrue(typeof tooEarly.warning === 'string' && tooEarly.warning.length > 0, '針對 <20+0 週產生臨床警示訊息');

    const tooLate = validateGestationalAge(42, 2);
    assert.isTrue(tooLate.isValid, '42+2 週結構上為有效輸入');
    assert.isFalse(tooLate.isWithinRange, '42+2 週超出 FMF 驗證參考範圍');
    assert.isTrue(typeof tooLate.warning === 'string', '針對 >41+6 週產生臨床警示訊息');

    // 不合法數值拒絕
    const invalidDays = validateGestationalAge(35, 7);
    assert.isFalse(invalidDays.isValid, '天數 7 不合法 (必須介於 0 至 6)');

    const negativeDays = validateGestationalAge(35, -1);
    assert.isFalse(negativeDays.isValid, '負數天數不合法');

    const negativeWeeks = validateGestationalAge(-2, 0);
    assert.isFalse(negativeWeeks.isValid, '負數週數不合法');

    const nonIntegerWeeks = validateGestationalAge(35.5, 0);
    assert.isFalse(nonIntegerWeeks.isValid, '非整數週數不合法');

    const emptyWeeks = validateGestationalAge('', 0);
    assert.isFalse(emptyWeeks.isValid, '空白週數不合法');
  });

  // ==========================================
  // 2. CPR 計算與防護 (CPR CALCULATION)
  // ==========================================

  assert.describe('CPR 核心計算與數值防護 (CPR Calculation & Safety)', () => {
    // 典型範例：MCA PI 1.28, UA PI 1.02 -> CPR 1.2549...
    const cpr1 = calculateCPR(1.28, 1.02);
    assert.closeTo(cpr1, 1.28 / 1.02, 1e-9, '以完整 64 位元浮點精度計算 CPR');
    assert.equal(formatCPRForDisplay(cpr1), '1.25', '排版顯示時固定為小數點後 2 位');

    // 極值計算
    const cprHigh = calculateCPR(2.50, 0.50);
    assert.equal(cprHigh, 5.0, '高 CPR 數值計算正確');
    assert.equal(formatCPRForDisplay(cprHigh), '5.00', '整數 CPR 格式化為 5.00');

    // 除以零與非正數值攔截
    assert.throws(() => calculateCPR(1.28, 0), RangeError, '拒絕 UA PI = 0 (除以零防護)');
    assert.throws(() => calculateCPR(1.28, -0.5), RangeError, '拒絕負數 UA PI');
    assert.throws(() => calculateCPR(-1.28, 1.02), RangeError, '拒絕負數 MCA PI');
    assert.throws(() => calculateCPR(0, 1.02), RangeError, '拒絕 MCA PI = 0');
    assert.throws(() => calculateCPR(NaN, 1.02), TypeError, '拒絕 NaN MCA PI');
    assert.throws(() => calculateCPR(1.28, NaN), TypeError, '拒絕 NaN UA PI');
    assert.throws(() => calculateCPR('', 1.02), TypeError, '拒絕空白 MCA PI');
    assert.throws(() => calculateCPR(1.28, ''), TypeError, '拒絕空白 UA PI');

    // 多普勒表單驗證小幫手
    const valResult = validateDopplerInputs(1.28, 1.02);
    assert.isTrue(valResult.isValid, '合規多普勒輸入通過驗證');

    const invalidValResult = validateDopplerInputs(0, -1);
    assert.isFalse(invalidValResult.isValid, '不合規多普勒輸入驗證失敗');
    assert.isTrue(Boolean(invalidValResult.errors.mcaPI), '正確產生 MCA PI = 0 之錯誤提示');
    assert.isTrue(Boolean(invalidValResult.errors.uaPI), '正確產生 UA PI 負數之錯誤提示');
  });

  // ==========================================
  // 3. 常態分佈與統計計算 (STATISTICS)
  // ==========================================

  assert.describe('常態分佈 CDF 與百分位數統計計算 (Statistics)', () => {
    assert.closeTo(normalCDF(0), 0.5, 1e-6, '標準常態 CDF(0) = 0.5');
    assert.closeTo(normalCDF(1.644853), 0.95, 1e-4, 'CDF(1.645) 約為 0.95 (第 95 百分位數)');
    assert.closeTo(normalCDF(-1.644853), 0.05, 1e-4, 'CDF(-1.645) 約為 0.05 (第 5 百分位數)');
    assert.closeTo(normalCDF(1.95996), 0.975, 1e-4, 'CDF(1.96) 約為 0.975');

    assert.closeTo(zScoreToPercentile(0), 50.0, 1e-4, 'Z = 0 對應第 50 百分位數');
    assert.closeTo(zScoreToPercentile(-1.644853), 5.0, 1e-2, 'Z = -1.645 對應第 5 百分位數');
    assert.closeTo(zScoreToPercentile(1.644853), 95.0, 1e-2, 'Z = 1.645 對應第 95 百分位數');

    // 中文百分位排版
    assert.isTrue(formatPercentile(5.0).includes('第 5 百分位數'), '格式化為 第 5 百分位數');
    assert.isTrue(formatPercentile(0.4).includes('< 第 1 百分位數'), '格式化為 < 第 1 百分位數');
    assert.isTrue(formatPercentile(99.5).includes('> 第 99 百分位數'), '格式化為 > 第 99 百分位數');

    // 線性 Z-Score
    const linZ = calculateZScore(12, 10, 2, false);
    assert.equal(linZ, 1.0, '線性 Z = (12-10)/2 = 1.0');

    // 對數 (log10) Z-Score
    const logZ = calculateZScore(100, 10, 1, true);
    assert.equal(logZ, 1.0, '對數 Z = (log10(100) - log10(10))/1 = 1.0');
  });

  // ==========================================
  // 4. FMF 2019 UA-PI 驗證模型
  // ==========================================

  assert.describe('FMF 2019 臍動脈 (UA-PI) 驗證迴歸模型', () => {
    // 懷孕 20 週 (140 天):
    // 中位數 = 1.6473 - (0.003005 * 140) = 1.2266
    const ref20 = fmf2019ReferenceModel.getUAReference(20.0);
    assert.isTrue(ref20.isVerified, 'UA 模型標記為已驗證');
    assert.closeTo(ref20.expectedMedian, 1.2266, 1e-3, '懷孕 20 週預期 UA PI 中位數約 1.23');

    // 懷孕 35 週 4 天 (249 天):
    // 中位數 = 1.6473 - (0.003005 * 249) = 0.899055
    const ref35_4 = fmf2019ReferenceModel.getUAReference(35 + 4 / 7);
    assert.closeTo(ref35_4.expectedMedian, 0.899055, 1e-3, '懷孕 35+4 週預期 UA PI 中位數約 0.90');

    // 百分位數嚴格遞增性
    assert.isTrue(ref35_4.centile5 < ref35_4.centile50, '第 5 百分位數 < 第 50 百分位數');
    assert.isTrue(ref35_4.centile50 < ref35_4.centile95, '第 50 百分位數 < 第 95 百分位數');

    // 實測值等於中位數時 Z-score = 0, 百分位 = 50%
    const zMedian = ref35_4.calculateZScore(ref35_4.expectedMedian);
    assert.closeTo(zMedian, 0.0, 1e-6, '中位數對應之 Z-score 為 0');
    const pMedian = ref35_4.calculatePercentile(ref35_4.expectedMedian);
    assert.closeTo(pMedian, 50.0, 1e-3, '中位數對應之百分位數為 50%');

    // 實測值等於第 95 百分位數時百分位數約 95%
    const p95 = ref35_4.calculatePercentile(ref35_4.centile95);
    assert.closeTo(p95, 95.0, 1e-2, '第 95 百分位對應之百分位數約 95%');
  });

  // ==========================================
  // 5. 臨床切點邊界測試 (4.99 vs 5.00, 95.00 vs 95.01)
  // ==========================================

  assert.describe('臨床切點嚴格邊界測試 (Boundary Checks)', () => {
    // CPR 4.99th -> 異常 (<5th)
    const cprAbnormalBoundary = interpretCPR(4.99);
    assert.equal(cprAbnormalBoundary.status, 'abnormal', 'CPR 4.99 百分位數嚴格判為異常 (<5th)');
    assert.isTrue(cprAbnormalBoundary.statement.includes('異常低 CPR'), '敘述包含「異常低 CPR」');
    assert.isTrue(cprAbnormalBoundary.statement.includes('腦血流重新分佈'), '敘述包含「腦血流重新分佈」');

    // CPR 5.00th -> 正常/臨界 (非異常)
    const cprNormalBoundary = interpretCPR(5.00);
    assert.equal(cprNormalBoundary.status, 'borderline', 'CPR 5.00 百分位數為邊界值 (5th–10th)，非異常');
    assert.isTrue(cprNormalBoundary.statement.includes('參考範圍內'), '敘述包含「參考範圍內」');

    // CPR 50.0th -> 正常
    const cpr50 = interpretCPR(50.0);
    assert.equal(cpr50.status, 'normal', 'CPR 50 百分位數為正常');

    // MCA PI 切點：4.99 vs 5.00
    const mcaAbnormal = interpretMCA(4.99);
    assert.equal(mcaAbnormal.status, 'abnormal', 'MCA PI 4.99 百分位數為偏低 (<5th)');
    assert.isTrue(mcaAbnormal.statement.includes('腦血管擴張'), '敘述符合「腦血管擴張」');

    const mcaNormal = interpretMCA(5.00);
    assert.equal(mcaNormal.status, 'normal', 'MCA PI 5.00 百分位數為正常 (≥5th)');

    // UA PI 切點：95.00 vs 95.01
    const uaNormalBoundary = interpretUA(95.00);
    assert.equal(uaNormalBoundary.status, 'borderline', 'UA PI 95.00 百分位數為臨界值 (≤95th)，未超標');
    assert.isTrue(uaNormalBoundary.statement.includes('參考範圍內'), 'UA PI 95.00 在參考範圍內');

    const uaAbnormalBoundary = interpretUA(95.01);
    assert.equal(uaAbnormalBoundary.status, 'abnormal', 'UA PI 95.01 百分位數為異常升高 (>95th)');
    assert.isTrue(uaAbnormalBoundary.statement.includes('胎盤血管阻力增加'), '敘述符合「胎盤血管阻力增加」');
  });

  // ==========================================
  // 6. ISUOG 綜合判讀案例測試 (Cases A to F)
  // ==========================================

  assert.describe('綜合多普勒血流判讀案例 (ISUOG Cases A–F)', () => {
    // 案例 A: 全部正常
    const caseA = interpretCombinedResults({
      cprPercentile: 50.0,
      mcaPercentile: 50.0,
      uaPercentile: 50.0,
      cprValue: 1.45
    });
    assert.equal(
      caseA.headline,
      '該懷孕週數的多普勒血流關係正常。',
      '案例 A：多普勒血流關係正常'
    );
    assert.equal(caseA.overallStatus, 'normal', '案例 A 整體狀態為 normal');
    assert.isFalse(caseA.isBrainSparing, '案例 A 不具腦保護現象');

    // 案例 B: CPR < 5th, MCA < 5th, UA 正常
    const caseB = interpretCombinedResults({
      cprPercentile: 3.0,
      mcaPercentile: 4.0,
      uaPercentile: 50.0,
      cprValue: 0.95
    });
    assert.equal(
      caseB.headline,
      '異常 CPR 合併低 MCA PI，符合腦血流重新分佈／腦保護效應。',
      '案例 B：異常 CPR 合併低 MCA PI'
    );
    assert.equal(caseB.overallStatus, 'abnormal', '案例 B 整體狀態為 abnormal');
    assert.isTrue(caseB.isBrainSparing, '案例 B 確認存在腦保護效應 (brain-sparing)');

    // 案例 C: CPR < 5th, UA > 95th, MCA 正常
    const caseC = interpretCombinedResults({
      cprPercentile: 2.5,
      mcaPercentile: 20.0,
      uaPercentile: 98.0,
      cprValue: 0.88
    });
    assert.equal(
      caseC.headline,
      '異常 CPR 合併胎盤阻力增加。',
      '案例 C：異常 CPR 合併胎盤阻力增加'
    );
    assert.equal(caseC.overallStatus, 'abnormal', '案例 C 整體狀態為 abnormal');
    assert.isTrue(caseC.isBrainSparing, '案例 C 確認存在腦保護效應');

    // 案例 D: MCA < 5th 但 CPR >= 5th
    const caseD = interpretCombinedResults({
      cprPercentile: 12.0,
      mcaPercentile: 4.5,
      uaPercentile: 20.0,
      cprValue: 1.15
    });
    assert.equal(
      caseD.headline,
      '檢測到 MCA PI 偏低。CPR 仍維持在參考範圍內。',
      '案例 D：低 MCA PI 但 CPR 正常'
    );
    assert.equal(caseD.overallStatus, 'borderline', '案例 D 整體狀態為 borderline');
    assert.isFalse(caseD.isBrainSparing, '案例 D 未定義為完全腦保護');

    // 案例 E: 嚴重合併 (CPR < 5th, MCA < 5th, UA > 95th)
    const caseE = interpretCombinedResults({
      cprPercentile: 1.0,
      mcaPercentile: 2.0,
      uaPercentile: 99.0,
      cprValue: 0.65
    });
    assert.isTrue(
      caseE.headline.includes('顯著腦血流重新分佈／腦保護效應與高胎盤阻力'),
      '案例 E：顯著腦保護與高胎盤阻力'
    );
    assert.equal(caseE.overallStatus, 'abnormal', '案例 E 整體狀態為 abnormal');
    assert.isTrue(caseE.isBrainSparing, '案例 E 確認存在腦保護效應');

    // 案例 F: UA > 95th 但 CPR 正常
    const caseF = interpretCombinedResults({
      cprPercentile: 20.0,
      mcaPercentile: 30.0,
      uaPercentile: 97.0,
      cprValue: 1.10
    });
    assert.equal(
      caseF.headline,
      '檢測到臍動脈 PI 升高。CPR 仍維持在參考範圍內。',
      '案例 F：單純臍動脈 PI 升高但 CPR 正常'
    );
    assert.equal(caseF.overallStatus, 'borderline', '案例 F 整體狀態為 borderline');

    // 歷史門檻值 CPR < 1.0 提示檢查
    assert.isTrue(
      caseB.historicalCprNote.includes('< 1.0'),
      '當 CPR < 1.0 時提供歷史門檻值解析說明'
    );
    assert.isTrue(
      caseA.historicalCprNote.includes('≥ 1.0'),
      '當 CPR ≥ 1.0 時提供特定週數優先之解析說明'
    );
  });
}
