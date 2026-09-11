/**
 * 胎兒 CPR 純百分位換算器 (Fetal CPR Pure Percentile Calculator)
 * 嚴格遵循 FMF 2019 Table S1 (Ciobanu et al.) 獨立核驗模型
 * 零病患儲存 · 零正常/異常分類 · 嚴格 Fail-Closed 防護
 */

(function (global) {
  'use strict';

  // =========================================================================
  // 1. 臨床統計核心 (標準常態 CDF 與誤差函數)
  // =========================================================================

  function erf(x) {
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
   * 標準常態累積分佈函數 Φ(z)
   * 嚴格除以 Math.SQRT2
   */
  function normalCDF(z) {
    if (!Number.isFinite(z)) return NaN;
    return 0.5 * (1.0 + erf(z / Math.SQRT2));
  }

  function zScoreToPercentile(z) {
    const cdf = normalCDF(z);
    return Number.isNaN(cdf) ? NaN : cdf * 100.0;
  }

  // =========================================================================
  // 2. 嚴格輸入驗證 (Fail-Closed Validations)
  // =========================================================================

  /**
   * 孕週驗證：僅接受 20+0 至 41+6 (140 至 293 妊娠天數)
   */
  function validateGestationalAge(weeks, days) {
    const w = Number(weeks);
    const d = Number(days);

    if (!Number.isInteger(w) || !Number.isInteger(d)) {
      return { isValid: false, reason: '週數與天數必須為整數' };
    }
    if (w < 20 || w > 41) {
      return { isValid: false, reason: '週數必須介於 20 至 41 週' };
    }
    if (d < 0 || d > 6) {
      return { isValid: false, reason: '天數必須介於 0 至 6 天' };
    }

    const totalDays = w * 7 + d;
    if (totalDays < 140 || totalDays > 293) {
      return { isValid: false, reason: '總妊娠天數必須介於 140 至 293 天 (20+0～41+6)' };
    }

    return {
      isValid: true,
      weeks: w,
      days: d,
      totalDays: totalDays,
      decimalWeeks: w + (d / 7)
    };
  }

  /**
   * 嚴格十進位數字驗證與合理範圍檢核
   * 拒絕科學記號、負數、空白、多重小數點
   */
  function validateStrictDecimal(valueStr, min = 0.10, max = 5.00) {
    if (typeof valueStr !== 'string') {
      return { isValid: false, reason: '輸入必須為字串' };
    }
    const trimmed = valueStr.trim();
    if (!trimmed) {
      return { isValid: false, reason: '輸入不能為空' };
    }

    // 嚴格十進位正數正則表達式
    const strictDecimalRegex = /^(0|[1-9]\d*)(\.\d+)?$/;
    if (!strictDecimalRegex.test(trimmed)) {
      return { isValid: false, reason: '必須為合法正十進位數字' };
    }

    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      return { isValid: false, reason: '數值不合法' };
    }
    if (num < min || num > max) {
      return { isValid: false, reason: `數值超出臨床合理範圍 (${min.toFixed(2)}–${max.toFixed(2)})` };
    }

    return { isValid: true, value: num };
  }

  /**
   * 計算 CPR = MCA PI / UmA PI
   */
  function calculateCPR(mcaPI, uaPI) {
    if (!Number.isFinite(mcaPI) || !Number.isFinite(uaPI) || mcaPI <= 0 || uaPI <= 0) {
      return NaN;
    }
    return mcaPI / uaPI;
  }

  // =========================================================================
  // 3. FMF 2019 Table S1 獨立核驗模型
  // =========================================================================

  const CPR_COEFFICIENTS = {
    source: 'FMF 2019 Table S1 (Ciobanu et al., UOG 2019; 53: 465–472)',
    parameter: 'Cerebroplacental Ratio (CPR = MCA PI / UA PI)',
    isVerified: true, // 經 Table S1 獨立核驗
    verificationStatus: '經原始 FMF 2019 Table S1 獨立核驗',
    validRangeDays: [140, 293],
    equationType: 'cubic_median_quadratic_sd_log10',
    alpha: [-0.1820, 0.00392, -0.00000854, 0],
    delta: [0.0952, -0.000251, 0.00000085]
  };

  /**
   * 取得 CPR 參考模型。若模型尚未核驗 (isVerified !== true)，拒絕換算 percentile
   */
  function getCPRReference(gaDecimalWeeks, coeff = CPR_COEFFICIENTS) {
    if (!coeff || coeff.isVerified !== true) {
      return {
        expectedMedian: NaN,
        sd: NaN,
        isVerified: false,
        calculateZScore: () => NaN,
        calculatePercentile: () => NaN
      };
    }

    const gaDays = gaDecimalWeeks * 7;
    if (gaDays < coeff.validRangeDays[0] || gaDays > coeff.validRangeDays[1]) {
      return {
        expectedMedian: NaN,
        sd: NaN,
        isVerified: true,
        calculateZScore: () => NaN,
        calculatePercentile: () => NaN
      };
    }

    const alpha = coeff.alpha;
    const delta = coeff.delta;

    const logMedian = alpha[0] + (alpha[1] * gaDays) + (alpha[2] * gaDays * gaDays) + ((alpha[3] || 0) * gaDays * gaDays * gaDays);
    const median = Math.pow(10, logMedian);
    const sd = delta[0] + (delta[1] * gaDays) + (delta[2] * gaDays * gaDays);

    return {
      expectedMedian: median,
      sd: sd,
      isVerified: true,
      calculateZScore: (measured) => {
        if (!Number.isFinite(measured) || measured <= 0 || median <= 0 || sd <= 0) return NaN;
        return (Math.log10(measured) - Math.log10(median)) / sd;
      },
      calculatePercentile: (measured) => {
        if (!Number.isFinite(measured) || measured <= 0 || median <= 0 || sd <= 0) return NaN;
        const z = (Math.log10(measured) - Math.log10(median)) / sd;
        return zScoreToPercentile(z);
      }
    };
  }

  // =========================================================================
  // 4. UI 控制器 (僅在瀏覽器 / WebView DOM 環境啟動)
  // =========================================================================

  const ITEM_HEIGHT = 32;
  const MIN_WEEK = 20;
  const MAX_WEEK = 41; // 嚴格上限 41 週 (+ 6 天 = 41+6)

  let currentWeek = 24;
  let currentDay = 0;

  let elResCpr, elResCentile, elGaSelectedDisplay;
  let elInputMca, elInputUma, btnClearMca, btnClearUma;
  let elPickerColWeeks, elWheelWeeks, elPickerColDays, elWheelDays;

  function calculateAndRender() {
    if (!elResCpr || !elResCentile) return;

    // 1. 驗證週數 (20+0 至 41+6)
    const gaResult = validateGestationalAge(currentWeek, currentDay);
    if (elGaSelectedDisplay) {
      if (gaResult.isValid) {
        elGaSelectedDisplay.textContent = `${currentWeek} 週 ${currentDay} 天 (${gaResult.decimalWeeks.toFixed(1)}w)`;
      } else {
        elGaSelectedDisplay.textContent = '超界 (需 20+0～41+6)';
      }
    }

    // 2. 嚴格驗證 MCA PI 與 UmA PI
    const mcaStr = elInputMca ? elInputMca.value : '';
    const umaStr = elInputUma ? elInputUma.value : '';

    const mcaValid = validateStrictDecimal(mcaStr, 0.10, 5.00);
    const umaValid = validateStrictDecimal(umaStr, 0.10, 5.00);

    // Fail-Closed：若 MCA 或 UmA 任一無效，CPR 與 百分位數皆顯示 —
    if (!mcaValid.isValid || !umaValid.isValid) {
      elResCpr.textContent = '—';
      elResCentile.textContent = '—';
      return;
    }

    // 計算 CPR
    const cpr = calculateCPR(mcaValid.value, umaValid.value);
    if (!Number.isFinite(cpr)) {
      elResCpr.textContent = '—';
      elResCentile.textContent = '—';
      return;
    }
    elResCpr.textContent = cpr.toFixed(2);

    // 3. 百分位換算 (依 FMF 2019 Table S1 核驗模型)
    if (!gaResult.isValid) {
      // 孕週不在 20+0～41+6 範圍內，百分位無法推算
      elResCentile.textContent = '—';
      return;
    }

    const ref = getCPRReference(gaResult.decimalWeeks);
    if (!ref.isVerified) {
      // 模型尚未核驗時不得顯示 percentile
      elResCentile.textContent = '—';
      return;
    }

    const centile = ref.calculatePercentile(cpr);
    if (Number.isFinite(centile)) {
      if (centile < 1.0) {
        elResCentile.textContent = '< 1%';
      } else if (centile > 99.0) {
        elResCentile.textContent = '> 99%';
      } else {
        elResCentile.textContent = `${centile.toFixed(1)}%`;
      }
    } else {
      elResCentile.textContent = '—';
    }
  }

  // 轉輪構建 (20 ~ 41 週, 0 ~ 6 天)
  function buildWheels() {
    if (!elWheelWeeks || !elWheelDays) return;

    elWheelWeeks.innerHTML = '';
    for (let w = MIN_WEEK; w <= MAX_WEEK; w++) {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.dataset.val = w;
      item.textContent = `${w} 週`;
      item.addEventListener('click', () => scrollToWeek(w, true));
      elWheelWeeks.appendChild(item);
    }

    elWheelDays.innerHTML = '';
    for (let d = 0; d <= 6; d++) {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.dataset.val = d;
      item.textContent = `${d} 天`;
      item.addEventListener('click', () => scrollToDay(d, true));
      elWheelDays.appendChild(item);
    }
  }

  function scrollToWeek(week, smooth = false) {
    const idx = Math.max(0, Math.min(MAX_WEEK - MIN_WEEK, week - MIN_WEEK));
    elPickerColWeeks?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
    updateWheelActiveState(elWheelWeeks, idx);
  }

  function scrollToDay(day, smooth = false) {
    const idx = Math.max(0, Math.min(6, day));
    elPickerColDays?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
    updateWheelActiveState(elWheelDays, idx);
  }

  function updateWheelActiveState(wheelEl, activeIdx) {
    if (!wheelEl) return;
    const items = wheelEl.querySelectorAll('.picker-item');
    items.forEach((it, idx) => {
      if (idx === activeIdx) it.classList.add('active');
      else it.classList.remove('active');
    });
  }

  let scrollTimerWeeks = null;
  let scrollTimerDays = null;

  function onWeeksScroll() {
    if (!elPickerColWeeks) return;
    const top = elPickerColWeeks.scrollTop;
    const idx = Math.round(top / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(MAX_WEEK - MIN_WEEK, idx));
    const weekVal = MIN_WEEK + clampedIdx;

    updateWheelActiveState(elWheelWeeks, clampedIdx);
    if (currentWeek !== weekVal) {
      currentWeek = weekVal;
      calculateAndRender();
    }

    if (scrollTimerWeeks) clearTimeout(scrollTimerWeeks);
    scrollTimerWeeks = setTimeout(() => {
      const target = clampedIdx * ITEM_HEIGHT;
      if (Math.abs(elPickerColWeeks.scrollTop - target) > 1) {
        elPickerColWeeks.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 120);
  }

  function onDaysScroll() {
    if (!elPickerColDays) return;
    const top = elPickerColDays.scrollTop;
    const idx = Math.round(top / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(6, idx));
    const dayVal = clampedIdx;

    updateWheelActiveState(elWheelDays, clampedIdx);
    if (currentDay !== dayVal) {
      currentDay = dayVal;
      calculateAndRender();
    }

    if (scrollTimerDays) clearTimeout(scrollTimerDays);
    scrollTimerDays = setTimeout(() => {
      const target = clampedIdx * ITEM_HEIGHT;
      if (Math.abs(elPickerColDays.scrollTop - target) > 1) {
        elPickerColDays.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 120);
  }

  function setupInputs() {
    [elInputMca, elInputUma].forEach(input => {
      if (!input) return;
      input.addEventListener('input', calculateAndRender);
      input.addEventListener('change', calculateAndRender);
      input.addEventListener('keyup', calculateAndRender);
    });

    btnClearMca?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elInputMca) {
        elInputMca.value = '';
        elInputMca.focus();
        calculateAndRender();
      }
    });

    btnClearUma?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elInputUma) {
        elInputUma.value = '';
        elInputUma.focus();
        calculateAndRender();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.input-field-box')) {
        if (document.activeElement === elInputMca || document.activeElement === elInputUma) {
          document.activeElement.blur();
        }
      }
    });
  }

  function initUI() {
    elResCpr = document.getElementById('res-cpr-val');
    elResCentile = document.getElementById('res-centile-val');
    elGaSelectedDisplay = document.getElementById('ga-selected-display');

    elInputMca = document.getElementById('input-mca');
    elInputUma = document.getElementById('input-uma');
    btnClearMca = document.getElementById('btn-clear-mca');
    btnClearUma = document.getElementById('btn-clear-uma');

    elPickerColWeeks = document.getElementById('picker-col-weeks');
    elWheelWeeks = document.getElementById('wheel-weeks');
    elPickerColDays = document.getElementById('picker-col-days');
    elWheelDays = document.getElementById('wheel-days');

    buildWheels();
    setupInputs();

    elPickerColWeeks?.addEventListener('scroll', onWeeksScroll, { passive: true });
    elPickerColDays?.addEventListener('scroll', onDaysScroll, { passive: true });

    setTimeout(() => {
      scrollToWeek(24, false);
      scrollToDay(0, false);
      calculateAndRender();
    }, 50);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI();
    }
  }

  // =========================================================================
  // 5. 導出 API (供自動化測試直接檢驗 Production Bundle)
  // =========================================================================

  const exportedAPI = {
    erf,
    normalCDF,
    zScoreToPercentile,
    validateGestationalAge,
    validateStrictDecimal,
    calculateCPR,
    getCPRReference,
    CPR_COEFFICIENTS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedAPI;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.FetalDoppler = exportedAPI;
  }
  global.FetalDoppler = exportedAPI;

})(typeof globalThis !== 'undefined' ? globalThis : this);
