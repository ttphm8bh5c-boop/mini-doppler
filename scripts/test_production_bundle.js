/**
 * 針對 Production WebAssets/app.bundle.js 的獨立嚴格臨床測試 Runner
 * 任何一項測試失敗，保證以非零狀態碼 (Non-zero exit code) 終止！
 */

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    print(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    failures.push(message);
    print(`  ✕ FAIL: ${message}`);
  }
}

function assertCloseTo(actual, expected, delta, message) {
  const diff = Math.abs(actual - expected);
  assert(diff <= delta, `${message} (預期 ${expected}, 實際 ${actual}, 誤差 ${diff.toFixed(6)} <= ${delta})`);
}

print("===============================================================");
print("🔍 開始測試 Production: ios/FetalDoppler/WebAssets/app.bundle.js");
print("===============================================================\n");

// 1. 直接讀取並執行 Production bundle 程式碼
const bundleCode = readFile("ios/FetalDoppler/WebAssets/app.bundle.js");
if (!bundleCode) {
  throw new Error("無法載入 ios/FetalDoppler/WebAssets/app.bundle.js！");
}

// 執行 Production Bundle
(new Function(bundleCode))();

const Core = globalThis.FetalDoppler;
if (!Core) {
  throw new Error("Production Bundle 未正確匯出 FetalDoppler API！");
}

// =========================================================================
// 測試項目 1: FMF 2019 Table S1 模型獨立核驗與 Known-Answer Tests
// =========================================================================
print("[1] FMF 2019 Table S1 模型獨立核驗與 Known-Answer Tests:");

// 1.1 Table S1 係數核對
assert(Core.CPR_COEFFICIENTS.isVerified === true, "模型已明確標註經 Table S1 獨立核驗 (isVerified: true)");
assert(Core.CPR_COEFFICIENTS.alpha[0] === -0.1820, "Table S1 alpha_0 係數為 -0.1820");
assert(Core.CPR_COEFFICIENTS.alpha[1] === 0.00392, "Table S1 alpha_1 係數為 0.00392");
assert(Core.CPR_COEFFICIENTS.alpha[2] === -0.00000854, "Table S1 alpha_2 係數為 -0.00000854");
assert(Core.CPR_COEFFICIENTS.delta[0] === 0.0952, "Table S1 delta_0 係數為 0.0952");
assert(Core.CPR_COEFFICIENTS.delta[1] === -0.000251, "Table S1 delta_1 係數為 -0.000251");
assert(Core.CPR_COEFFICIENTS.delta[2] === 0.00000085, "Table S1 delta_2 係數為 0.00000085");

// 1.2 Table S1 Golden Dataset 逐週中位數比對
const goldenDataset = [
  { weeks: 20, expectedMedian: 1.583, expectedSD: 0.0767 },
  { weeks: 24, expectedMedian: 1.720, expectedSD: 0.0770 },
  { weeks: 28, expectedMedian: 1.812, expectedSD: 0.0787 },
  { weeks: 32, expectedMedian: 1.852, expectedSD: 0.0816 },
  { weeks: 36, expectedMedian: 1.834, expectedSD: 0.0859 },
  { weeks: 40, expectedMedian: 1.762, expectedSD: 0.0916 }
];

goldenDataset.forEach(g => {
  const ref = Core.getCPRReference(g.weeks);
  assertCloseTo(ref.expectedMedian, g.expectedMedian, 0.005, `${g.weeks} 週中位數吻合 Table S1`);
  assertCloseTo(ref.sd, g.expectedSD, 0.005, `${g.weeks} 週 SD 吻合 Table S1`);
});

// 1.3 Known-Answer Test (KAT): GA 28+4, CPR 1.44 -> 百分位約 9.8%
const katRef = Core.getCPRReference(28 + 4 / 7);
const katPercentile = katRef.calculatePercentile(1.44);
assertCloseTo(katPercentile, 9.8, 0.2, "重現案例 GA 28+4, CPR 1.44 精確計算為 9.8% 百分位");

// 1.4 標準常態 CDF KAT
assertCloseTo(Core.normalCDF(0.0), 0.50, 1e-7, "Z = 0.0 對應 50.0% CDF");
assertCloseTo(Core.normalCDF(-1.644853), 0.05, 1e-4, "Z = -1.644853 對應 5.0% CDF");
assertCloseTo(Core.normalCDF(1.644853), 0.95, 1e-4, "Z = +1.644853 對應 95.0% CDF");

// 1.5 模型尚未核驗時不得顯示 percentile (Fail-Closed Gate)
const unverifiedCoeff = { ...Core.CPR_COEFFICIENTS, isVerified: false };
const unverifiedRef = Core.getCPRReference(28.57, unverifiedCoeff);
assert(Number.isNaN(unverifiedRef.calculatePercentile(1.44)), "若模型未核驗 (isVerified: false)，強制回傳 NaN 拒絕換算 percentile");

// =========================================================================
// 測試項目 2: 孕週只接受 20+0 ～ 41+6 嚴格邊界驗證
// =========================================================================
print("\n[2] 孕週只接受 20+0 ～ 41+6 嚴格邊界驗證:");

assert(Core.validateGestationalAge(20, 0).isValid === true, "20+0 週 (140天，下限邊界) 合法");
assert(Core.validateGestationalAge(41, 6).isValid === true, "41+6 週 (293天，上限邊界) 合法");
assert(Core.validateGestationalAge(30, 4).isValid === true, "30+4 週 合法");

assert(Core.validateGestationalAge(19, 6).isValid === false, "19+6 週 (139天，小於20週) 必須拒絕");
assert(Core.validateGestationalAge(42, 0).isValid === false, "42+0 週 (超出41+6) 必須拒絕");
assert(Core.validateGestationalAge(28, 7).isValid === false, "天數為 7 必須拒絕");
assert(Core.validateGestationalAge(28, -1).isValid === false, "天數為負數 必須拒絕");
assert(Core.validateGestationalAge(28.5, 0).isValid === false, "週數為浮點數 必須拒絕");
assert(Core.validateGestationalAge("abc", 0).isValid === false, "非數字字串 必須拒絕");

// =========================================================================
// 測試項目 3: PI 嚴格十進位與合理範圍 (0.10 ～ 5.00) 驗證
// =========================================================================
print("\n[3] PI 嚴格十進位與合理範圍驗證 (0.10 ～ 5.00):");

assert(Core.validateStrictDecimal("1.75").isValid === true, "'1.75' 格式合法");
assert(Core.validateStrictDecimal("0.88").isValid === true, "'0.88' 格式合法");
assert(Core.validateStrictDecimal("5.00").isValid === true, "'5.00' 邊界值合法");
assert(Core.validateStrictDecimal("0.10").isValid === true, "'0.10' 邊界值合法");

assert(Core.validateStrictDecimal("1.75.2").isValid === false, "'1.75.2' 多重小數點拒絕");
assert(Core.validateStrictDecimal("1e2").isValid === false, "'1e2' 科學記號拒絕");
assert(Core.validateStrictDecimal("-1.5").isValid === false, "'-1.5' 負數拒絕");
assert(Core.validateStrictDecimal("+1.5").isValid === false, "'+1.5' 符號拒絕");
assert(Core.validateStrictDecimal("").isValid === false, "空字串拒絕");
assert(Core.validateStrictDecimal("   ").isValid === false, "空白字串拒絕");
assert(Core.validateStrictDecimal("0.05").isValid === false, "'0.05' 低於臨床合理下限 (0.10) 拒絕");
assert(Core.validateStrictDecimal("5.50").isValid === false, "'5.50' 超過臨床合理上限 (5.00) 拒絕");

assert(Core.normalizePIShorthand("125") === "1.25", "三碼快速輸入 '125' 轉為 '1.25'");
assert(Core.normalizePIShorthand("075") === "0.75", "三碼快速輸入 '075' 轉為 '0.75'");
assert(Core.normalizePIShorthand("010") === "0.10", "三碼快速輸入下限 '010' 轉為 '0.10'");
assert(Core.normalizePIShorthand("500") === "5.00", "三碼快速輸入上限 '500' 轉為 '5.00'");
assert(Core.normalizePIShorthand("005") === "005", "低於下限的三碼輸入不轉換並交由驗證拒絕");
assert(Core.normalizePIShorthand("550") === "550", "高於上限的三碼輸入不轉換並交由驗證拒絕");
assert(Core.normalizePIShorthand("1.25") === "1.25", "既有小數輸入維持原樣");
assert(Core.normalizePIShorthand("12") === "12", "未滿三碼輸入維持原樣");

// =========================================================================
// 測試項目 4: CPR 計算與 Fail-Closed 防護
// =========================================================================
print("\n[4] CPR 計算與 Fail-Closed 防護:");

assertCloseTo(Core.calculateCPR(1.75, 1.20), 1.75 / 1.20, 1e-9, "CPR = 1.75 / 1.20 正確計算");
assert(Number.isNaN(Core.calculateCPR(NaN, 1.20)), "MCA 為 NaN 時 CPR 回傳 NaN");
assert(Number.isNaN(Core.calculateCPR(1.75, 0)), "UmA 為 0 (除以零) CPR 回傳 NaN");
assert(Number.isNaN(Core.calculateCPR(-1.0, 1.0)), "負數 PI CPR 回傳 NaN");

// =========================================================================
// 測試項目 5: 移除病患追蹤、資料儲存與正常／異常分類審查
// =========================================================================
print("\n[5] 審查 Production 介面與程式碼中無任何病患追蹤或分類標籤:");

const htmlCode = readFile("ios/FetalDoppler/WebAssets/index.html");
assert(!htmlCode.includes("status-badge"), "HTML 中無 status-badge 標籤");
assert(!htmlCode.includes("常態區間"), "HTML 中無 '常態區間' 分類用語");
assert(!htmlCode.includes("異常偏低"), "HTML 中無 '異常偏低' 分類用語");
assert(!htmlCode.includes("patient"), "HTML 中無病患追蹤相關元素");
assert(!bundleCode.includes("localStorage"), "Bundle 中無任何 localStorage 儲存調用");
assert(!bundleCode.includes("isAbnormal"), "Bundle 中無 isAbnormal 臨床診斷分類欄位");

// =========================================================================
// 測試結果彙總
// =========================================================================
print("\n===============================================================");
print(`總測試項目: ${totalTests}`);
print(`通過: ${passedTests}`);
print(`失敗: ${failedTests}`);
print("===============================================================");

if (failedTests > 0) {
  print("\n❌ 測試失敗清單:");
  failures.forEach(f => print("  - " + f));
  // 關鍵要求：以非零狀態碼結束！
  throw new Error(`測試失敗！共有 ${failedTests} 項測試未通過。`);
} else {
  print("\n🎉 恭喜！Production WebAssets/app.bundle.js 100% 通過所有嚴格稽核！");
}
