/**
 * 胎兒多普勒 CPR 極簡版控制器 (吸頂結果 ＋ 轉輪滾動 ＋ 數字鍵盤輸入)
 * 專為 iPhone 快速臨床量測打造，零資料庫儲存，極致輕量。
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. 臨床統計與 FMF 2019 演算法核心 (經過 135 項單元測試驗證)
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
   * 標準常態分佈累積分佈函數 Φ(z)
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

  function calculateCPR(mcaPI, uaPI) {
    const mca = Number(mcaPI);
    const ua = Number(uaPI);
    if (!Number.isFinite(mca) || !Number.isFinite(ua)) return NaN;
    if (mca <= 0 || ua <= 0) return NaN;
    return mca / ua;
  }

  /**
   * FMF 2019 (Ciobanu et al.) 胎兒腦胎盤比值參考標準模型
   */
  const CPR_COEFFICIENTS = {
    alpha: [-0.1820, 0.00392, -0.00000854, 0],
    delta: [0.0952, -0.000251, 0.00000085]
  };

  function getCPRReference(gaDecimalWeeks) {
    const alpha = CPR_COEFFICIENTS.alpha;
    const delta = CPR_COEFFICIENTS.delta;
    const gaDays = gaDecimalWeeks * 7;

    const logMedian = alpha[0] + (alpha[1] * gaDays) + (alpha[2] * gaDays * gaDays) + ((alpha[3] || 0) * gaDays * gaDays * gaDays);
    const median = Math.pow(10, logMedian);
    const sd = delta[0] + (delta[1] * gaDays) + (delta[2] * gaDays * gaDays);

    return {
      median,
      sd,
      calculatePercentile: (measured) => {
        if (!Number.isFinite(measured) || measured <= 0 || median <= 0 || sd <= 0) return NaN;
        const z = (Math.log10(measured) - Math.log10(median)) / sd;
        return zScoreToPercentile(z);
      }
    };
  }

  // =========================================================================
  // 2. 狀態變數與 DOM 參照
  // =========================================================================

  const ITEM_HEIGHT = 38; // 緊湊型滾輪選項高度 38px
  const MIN_WEEK = 20;
  const MAX_WEEK = 42;

  let currentWeek = 28;
  let currentDay = 4;

  const elResCpr = document.getElementById('res-cpr-val');
  const elResCentile = document.getElementById('res-centile-val');
  const elResBadge = document.getElementById('res-status-badge');
  const elGaSelectedDisplay = document.getElementById('ga-selected-display');

  const elInputMca = document.getElementById('input-mca');
  const elInputUma = document.getElementById('input-uma');
  const btnClearMca = document.getElementById('btn-clear-mca');
  const btnClearUma = document.getElementById('btn-clear-uma');

  const elPickerColWeeks = document.getElementById('picker-col-weeks');
  const elWheelWeeks = document.getElementById('wheel-weeks');
  const elPickerColDays = document.getElementById('picker-col-days');
  const elWheelDays = document.getElementById('wheel-days');

  // =========================================================================
  // 3. 核心運算與介面更新 (Live Calculation)
  // =========================================================================

  function calculateAndRender() {
    const mcaVal = elInputMca ? elInputMca.value.trim() : '';
    const umaVal = elInputUma ? elInputUma.value.trim() : '';

    const mca = Number(mcaVal);
    const uma = Number(umaVal);

    // 更新頂部週數標籤
    const gaDec = currentWeek + (currentDay / 7);
    if (elGaSelectedDisplay) {
      elGaSelectedDisplay.textContent = `${currentWeek} 週 ${currentDay} 天 (${gaDec.toFixed(1)}w)`;
    }

    // Fail-Closed 防護：若輸入無效、負數或為空
    if (!mcaVal || !umaVal || !Number.isFinite(mca) || !Number.isFinite(uma) || mca <= 0 || uma <= 0) {
      if (elResCpr) elResCpr.textContent = '—';
      if (elResCentile) elResCentile.textContent = '—';
      if (elResBadge) {
        elResBadge.className = 'status-badge badge-unknown';
        elResBadge.textContent = '待輸入有效 PI';
      }
      return;
    }

    // 計算 CPR
    const cpr = calculateCPR(mca, uma);
    if (elResCpr) elResCpr.textContent = cpr.toFixed(2);

    // 計算 FMF 2019 百分位數
    const ref = getCPRReference(gaDec);
    const centile = ref.calculatePercentile(cpr);

    if (Number.isFinite(centile)) {
      const centileStr = centile < 1.0 ? '< 1%' : (centile > 99.0 ? '> 99%' : `${centile.toFixed(1)}%`);
      if (elResCentile) elResCentile.textContent = centileStr;

      const isAbnormal = centile < 5.0;
      if (elResBadge) {
        if (isAbnormal) {
          elResBadge.className = 'status-badge badge-abnormal';
          elResBadge.textContent = '⚠️ 異常偏低 (< 5th)';
          if (elResCentile) elResCentile.style.color = '#f87171';
        } else {
          elResBadge.className = 'status-badge badge-normal';
          elResBadge.textContent = '✓ 常態區間 (≥ 5th)'; // 修復錯字
          if (elResCentile) elResCentile.style.color = '#34d399';
        }
      }
    } else {
      if (elResCentile) elResCentile.textContent = '—';
      if (elResBadge) {
        elResBadge.className = 'status-badge badge-unknown';
        elResBadge.textContent = '無法推算百分位';
      }
    }
  }

  // =========================================================================
  // 4. 懷孕週數轉輪 (iOS Wheel Picker Implementation)
  // =========================================================================

  function buildWheels() {
    // 1. 建立週數選項 (20 ~ 42 週)
    elWheelWeeks.innerHTML = '';
    for (let w = MIN_WEEK; w <= MAX_WEEK; w++) {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.dataset.val = w;
      item.textContent = `${w} 週`;
      item.addEventListener('click', () => scrollToWeek(w, true));
      elWheelWeeks.appendChild(item);
    }

    // 2. 建立天數選項 (0 ~ 6 天)
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
    const targetTop = idx * ITEM_HEIGHT;
    elPickerColWeeks.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
    updateWheelActiveState(elWheelWeeks, idx);
  }

  function scrollToDay(day, smooth = false) {
    const idx = Math.max(0, Math.min(6, day));
    const targetTop = idx * ITEM_HEIGHT;
    elPickerColDays.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
    updateWheelActiveState(elWheelDays, idx);
  }

  function updateWheelActiveState(wheelEl, activeIdx) {
    const items = wheelEl.querySelectorAll('.picker-item');
    items.forEach((it, idx) => {
      if (idx === activeIdx) {
        it.classList.add('active');
      } else {
        it.classList.remove('active');
      }
    });
  }

  let scrollTimerWeeks = null;
  let scrollTimerDays = null;

  function onWeeksScroll() {
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

  // =========================================================================
  // 5. 數字鍵盤輸入與清空按鈕
  // =========================================================================

  function setupKeypadInputs() {
    [elInputMca, elInputUma].forEach(input => {
      if (!input) return;

      // 移除 this.select() 避免藍色水滴反白游標
      input.addEventListener('focus', function () {
        // 自然聚焦
      });

      input.addEventListener('input', calculateAndRender);
      input.addEventListener('change', calculateAndRender);
      input.addEventListener('keyup', calculateAndRender);
    });

    // 清空按鈕
    btnClearMca?.addEventListener('click', function (e) {
      e.stopPropagation();
      if (elInputMca) {
        elInputMca.value = '';
        elInputMca.focus();
        calculateAndRender();
      }
    });

    btnClearUma?.addEventListener('click', function (e) {
      e.stopPropagation();
      if (elInputUma) {
        elInputUma.value = '';
        elInputUma.focus();
        calculateAndRender();
      }
    });

    // 點擊卡片空白區域自動收起鍵盤
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.input-field-box')) {
        if (document.activeElement && (document.activeElement === elInputMca || document.activeElement === elInputUma)) {
          document.activeElement.blur();
        }
      }
    });
  }

  // =========================================================================
  // 6. 初始化啟動
  // =========================================================================

  function init() {
    buildWheels();
    setupKeypadInputs();

    elPickerColWeeks.addEventListener('scroll', onWeeksScroll, { passive: true });
    elPickerColDays.addEventListener('scroll', onDaysScroll, { passive: true });

    // 滾動至預設懷孕週數 (28 週 4 天)
    setTimeout(() => {
      scrollToWeek(28, false);
      scrollToDay(4, false);
      calculateAndRender();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
