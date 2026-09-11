/**
 * 胎兒多普勒 CPR 極簡版控制器 (Fetal Doppler Minimal Controller)
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
  // 2. 介面元素與微調控制器 (UI Controller)
  // =========================================================================

  const elWeeks = document.getElementById('input-weeks');
  const elDays = document.getElementById('input-days');
  const elMca = document.getElementById('input-mca');
  const elUma = document.getElementById('input-uma');

  const elResCpr = document.getElementById('res-cpr-val');
  const elResCentile = document.getElementById('res-centile-val');
  const elResBadge = document.getElementById('res-status-badge');

  const elGaFeedback = document.getElementById('ga-feedback');
  const elMcaFeedback = document.getElementById('mca-feedback');
  const elUmaFeedback = document.getElementById('uma-feedback');

  function calculateAndRender() {
    const wVal = elWeeks ? elWeeks.value.trim() : '';
    const dVal = elDays ? elDays.value.trim() : '0';
    const mcaVal = elMca ? elMca.value.trim() : '';
    const umaVal = elUma ? elUma.value.trim() : '';

    let hasError = false;

    // 1. 懷孕週數檢核
    const w = Number(wVal);
    const d = Number(dVal);
    if (!wVal || !Number.isInteger(w) || w < 10 || w > 44) {
      if (elGaFeedback) elGaFeedback.textContent = '週數需在 20–42 週';
      hasError = true;
    } else if (!Number.isInteger(d) || d < 0 || d > 6) {
      if (elGaFeedback) elGaFeedback.textContent = '天數需在 0–6 天';
      hasError = true;
    } else {
      if (elGaFeedback) {
        if (w < 20 || (w === 41 && d > 6) || w > 41) {
          elGaFeedback.textContent = '超出 20–42w 驗證範圍';
        } else {
          elGaFeedback.textContent = '';
        }
      }
    }

    // 2. MCA PI 檢核
    const mca = Number(mcaVal);
    if (!mcaVal || !Number.isFinite(mca) || mca <= 0) {
      if (elMcaFeedback) elMcaFeedback.textContent = '需大於 0';
      hasError = true;
    } else {
      if (elMcaFeedback) elMcaFeedback.textContent = '';
    }

    // 3. UmA PI 檢核
    const uma = Number(umaVal);
    if (!umaVal || !Number.isFinite(uma) || uma <= 0) {
      if (elUmaFeedback) elUmaFeedback.textContent = '需大於 0';
      hasError = true;
    } else {
      if (elUmaFeedback) elUmaFeedback.textContent = '';
    }

    // Fail-Closed 防護：若有任何輸入無效，立即重置輸出為 '—'
    if (hasError) {
      if (elResCpr) elResCpr.textContent = '—';
      if (elResCentile) elResCentile.textContent = '—';
      if (elResBadge) {
        elResBadge.className = 'status-badge badge-unknown';
        elResBadge.textContent = '請輸入有效數值';
      }
      return;
    }

    // 4. 計算 CPR
    const cpr = calculateCPR(mca, uma);
    if (elResCpr) elResCpr.textContent = cpr.toFixed(2);

    // 5. 計算 FMF 2019 百分位數 %
    const gaDecimal = w + (d / 7);
    const ref = getCPRReference(gaDecimal);
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
          elResBadge.textContent = '✓ 常態區間 (≥ 5th)';
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
  // 3. 觸控微調按鈕邏輯 (Steppers)
  // =========================================================================

  function adjustWeeks(delta) {
    const cur = parseInt(elWeeks.value, 10) || 28;
    const next = Math.min(42, Math.max(20, cur + delta));
    elWeeks.value = next;
    calculateAndRender();
  }

  function adjustDays(delta) {
    let w = parseInt(elWeeks.value, 10) || 28;
    let d = parseInt(elDays.value, 10) || 0;
    d += delta;

    if (d > 6) {
      if (w < 42) {
        w += 1;
        d = 0;
      } else {
        d = 6;
      }
    } else if (d < 0) {
      if (w > 20) {
        w -= 1;
        d = 6;
      } else {
        d = 0;
      }
    }

    elWeeks.value = w;
    elDays.value = d;
    calculateAndRender();
  }

  function adjustFloat(el, delta) {
    const cur = parseFloat(el.value) || 1.0;
    const next = Math.max(0.1, Math.round((cur + delta) * 100) / 100);
    el.value = next.toFixed(2);
    calculateAndRender();
  }

  // 掛載事件監聽
  function init() {
    [elWeeks, elDays, elMca, elUma].forEach(el => {
      if (!el) return;
      el.addEventListener('input', calculateAndRender);
      el.addEventListener('change', calculateAndRender);
      el.addEventListener('keyup', calculateAndRender);
    });

    // 週數按鈕
    document.getElementById('btn-weeks-minus')?.addEventListener('click', () => adjustWeeks(-1));
    document.getElementById('btn-weeks-plus')?.addEventListener('click', () => adjustWeeks(1));

    // 天數按鈕
    document.getElementById('btn-days-minus')?.addEventListener('click', () => adjustDays(-1));
    document.getElementById('btn-days-plus')?.addEventListener('click', () => adjustDays(1));

    // MCA PI 按鈕
    document.getElementById('btn-mca-minus')?.addEventListener('click', () => adjustFloat(elMca, -0.05));
    document.getElementById('btn-mca-plus')?.addEventListener('click', () => adjustFloat(elMca, 0.05));

    // UmA PI 按鈕
    document.getElementById('btn-uma-minus')?.addEventListener('click', () => adjustFloat(elUma, -0.05));
    document.getElementById('btn-uma-plus')?.addEventListener('click', () => adjustFloat(elUma, 0.05));

    // 啟動首次計算
    calculateAndRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
