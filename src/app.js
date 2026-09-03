/**
 * iPad Minimal Application Controller
 * Pure utility tool: 3 inputs -> CPR value, percentile, status, and chart.
 */

import { validateGestationalAge, gestationalAgeToDecimal } from './clinical/gestationalAge.js';
import { calculateCPR, validateDopplerInputs, formatCPRForDisplay } from './clinical/calculateCPR.js';
import { fmf2019ReferenceModel } from './references/fmf2019/index.js';
import { renderCPRChart } from './components/CPRChart.js';

export function initApp() {
  const weeksInput = document.getElementById('input-ga-weeks');
  const daysInput = document.getElementById('input-ga-days');
  const mcaInput = document.getElementById('input-mca-pi');
  const umaInput = document.getElementById('input-uma-pi');
  const calcBtn = document.getElementById('btn-calculate');
  const gaWarnDisplay = document.getElementById('ga-warn');

  const cprNumDisplay = document.getElementById('display-cpr-num');
  const cprCentileDisplay = document.getElementById('display-cpr-centile');
  const cprStatusBadge = document.getElementById('display-cpr-status-badge');
  const chartMount = document.getElementById('chart-mount');

  function calculateAndRender() {
    const weeksVal = weeksInput.value;
    const daysVal = daysInput.value;
    const mcaVal = mcaInput.value;
    const umaVal = umaInput.value;

    // 1. Validate GA
    const gaRes = validateGestationalAge(weeksVal, daysVal);
    if (!gaRes.isValid) {
      gaWarnDisplay.className = 'field-warn';
      gaWarnDisplay.textContent = gaRes.error || '請輸入有效懷孕週數';
      return;
    }

    if (gaRes.warning) {
      gaWarnDisplay.className = 'field-warn';
      gaWarnDisplay.textContent = gaRes.warning;
    } else {
      gaWarnDisplay.className = 'field-warn hidden';
      gaWarnDisplay.textContent = '';
    }

    const gaDec = gaRes.decimalWeeks;

    // 2. Validate Doppler
    const dopplerRes = validateDopplerInputs(mcaVal, umaVal);
    if (!dopplerRes.isValid) {
      cprNumDisplay.textContent = '—';
      cprCentileDisplay.textContent = '—';
      return;
    }

    const mca = dopplerRes.mcaPI;
    const uma = dopplerRes.uaPI;

    // 3. Calculate CPR
    const cpr = calculateCPR(mca, uma);
    cprNumDisplay.textContent = formatCPRForDisplay(cpr);

    // 4. Calculate CPR Percentile via FMF 2019
    const cprRef = fmf2019ReferenceModel.getCPRReference(gaDec);
    const cprPercentile = cprRef.calculatePercentile(cpr);

    if (Number.isFinite(cprPercentile)) {
      const pStr = cprPercentile < 1 ? '< 1%' : (cprPercentile > 99 ? '> 99%' : `${cprPercentile.toFixed(1)}%`);
      cprCentileDisplay.textContent = pStr;

      const isAbnormal = cprPercentile < 5.0;
      if (isAbnormal) {
        cprStatusBadge.className = 'res-badge badge-abnormal';
        cprStatusBadge.textContent = '⚠️ 異常 (< 5%)';
      } else {
        cprStatusBadge.className = 'res-badge badge-normal';
        cprStatusBadge.textContent = '✓ 正常';
      }
    } else {
      cprCentileDisplay.textContent = '—';
    }

    // 5. Render CPR Chart
    renderCPRChart(chartMount, {
      patientGA: gaDec,
      patientCPR: cpr,
      patientPercentile: cprPercentile
    });
  }

  calcBtn?.addEventListener('click', calculateAndRender);

  weeksInput?.addEventListener('input', calculateAndRender);
  daysInput?.addEventListener('input', calculateAndRender);
  mcaInput?.addEventListener('input', calculateAndRender);
  umaInput?.addEventListener('input', calculateAndRender);

  calculateAndRender();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
