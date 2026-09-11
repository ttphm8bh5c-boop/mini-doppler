/**
 * 胎兒多普勒計算器 (Fetal Doppler CPR Calculator)
 * 完整獨立執行封裝 (Self-Contained Bundle)
 * 包含統計核心、Fail-Closed 輸入校驗、產科預產期換算、資料治理與全功能 UI 狀態機。
 */

(function (global) {
  'use strict';

  // =========================================================================
  // 1. 臨床統計模組 (Statistics Module)
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
   * 標準常態分佈累積機率函數 CDF N(0,1)
   * 嚴格除以 Math.SQRT2 (解決 Codex P0-1)
   */
  function normalCDF(z) {
    if (!Number.isFinite(z)) return NaN;
    return 0.5 * (1.0 + erf(z / Math.SQRT2));
  }

  function zScoreToPercentile(z) {
    const cdf = normalCDF(z);
    return Number.isNaN(cdf) ? NaN : cdf * 100.0;
  }

  function calculateZScore(observed, expectedMedian, sd, isLog10Scale) {
    if (!Number.isFinite(observed) || !Number.isFinite(expectedMedian) || !Number.isFinite(sd)) return NaN;
    if (sd <= 0) throw new RangeError('標準差必須大於零');
    if (isLog10Scale) {
      if (observed <= 0 || expectedMedian <= 0) throw new RangeError('對數轉換之數值必須大於零');
      return (Math.log10(observed) - Math.log10(expectedMedian)) / sd;
    }
    return (observed - expectedMedian) / sd;
  }

  function formatPercentile(percentile) {
    if (!Number.isFinite(percentile)) return '—';
    if (percentile < 1) return '< 第 1 百分位數 (<1st centile)';
    if (percentile > 99) return '> 第 99 百分位數 (>99th centile)';
    const rounded = Math.round(percentile * 10) / 10;
    const valStr = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    return `第 ${valStr} 百分位數 (${valStr}th centile)`;
  }

  // =========================================================================
  // 2. CPR 臨床計算模組 (calculateCPR Module)
  // =========================================================================

  function calculateCPR(mcaPI, uaPI) {
    const mca = Number(mcaPI);
    const ua = Number(uaPI);
    if (!Number.isFinite(mca) || !Number.isFinite(ua)) throw new TypeError('PI 必須為有限數值');
    if (mca <= 0) throw new RangeError('MCA PI 必須大於 0');
    if (ua <= 0) throw new RangeError('UA PI 必須大於 0');
    return mca / ua;
  }

  function formatCPRForDisplay(cpr) {
    return Number.isFinite(cpr) ? cpr.toFixed(2) : '—';
  }

  function validateDopplerInputs(mcaPI, uaPI) {
    const errors = {};
    let mca = NaN;
    let ua = NaN;

    if (mcaPI === '' || mcaPI === null || mcaPI === undefined) {
      errors.mcaPI = '請輸入 MCA PI（大腦中動脈 PI）。';
    } else {
      mca = Number(mcaPI);
      if (!Number.isFinite(mca) || mca <= 0) errors.mcaPI = 'MCA PI 必須大於 0。';
      else if (mca > 5.0) errors.mcaPI = 'MCA PI 超出一般生理範圍 (>5.0)。';
    }

    if (uaPI === '' || uaPI === null || uaPI === undefined) {
      errors.uaPI = '請輸入 UA PI（臍動脈 PI）。';
    } else {
      ua = Number(uaPI);
      if (!Number.isFinite(ua) || ua <= 0) errors.uaPI = 'UA PI 必須大於 0。';
      else if (ua > 5.0) errors.uaPI = 'UA PI 超出一般生理範圍 (>5.0)。';
    }

    return { isValid: Object.keys(errors).length === 0, mcaPI: mca, uaPI: ua, errors };
  }

  // =========================================================================
  // 3. 懷孕週數與日曆嚴格校驗模組 (Gestational Age & Calendar Module)
  // =========================================================================

  const MIN_GA_TOTAL_DAYS = 140; // 20w+0d
  const MAX_GA_TOTAL_DAYS = 293; // 41w+6d

  function gestationalAgeToDecimal(weeks, days) {
    return Number(weeks) + (Number(days || 0) / 7);
  }

  function validateGestationalAge(weeksInput, daysInput) {
    if (weeksInput === '' || weeksInput === null || weeksInput === undefined) {
      return { isValid: false, isWithinRange: false, weeks: NaN, days: NaN, decimalWeeks: NaN, error: '請輸入懷孕週數。' };
    }
    const weeks = Number(weeksInput);
    const days = daysInput === '' || daysInput === null || daysInput === undefined ? 0 : Number(daysInput);

    if (!Number.isInteger(weeks) || weeks < 0) {
      return { isValid: false, isWithinRange: false, weeks, days, decimalWeeks: NaN, error: '懷孕週數必須為正整數。' };
    }
    if (!Number.isInteger(days) || days < 0 || days > 6) {
      return { isValid: false, isWithinRange: false, weeks, days, decimalWeeks: NaN, error: '天數必須為 0 至 6 之間的整數。' };
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
        warning: `懷孕週數 (${weeks}+${days} 週) 超出 FMF 參考範圍 (20+0 至 41+6 週)。`
      };
    }

    return { isValid: true, isWithinRange: true, weeks, days, decimalWeeks };
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function validateCalendarDate(year, month, day) {
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

  function parseStrictDate(dateStr, referenceDate) {
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

    // 3. 常見完整西曆 YYYY[-/.]MM[-/.]DD (例如 2026-11-20, 2026/11/20, 2026.11.20, 2027-1-1)
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
      const targetYear = (mVal >= curMonth) ? curYear : (curYear + 1);
      if (!validateCalendarDate(targetYear, mVal, dVal)) return null;
      return new Date(targetYear, mVal - 1, dVal, 12, 0, 0);
    }

    return null;
  }

  function calculateGAFromEDD(eddStr, measureDateStr) {
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
      return { isValid: false, error: `推算天數為 ${gaDays} 天 (${Math.floor(gaDays/7)}週)，超出生理懷孕週期範圍。` };
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
      warning: isWithinRange ? undefined : `推算週數為 ${weeks}+${days} 週，超出 FMF 參考範圍 (20+0 至 41+6 週)。`
    };
  }

  // ==========================================
  // 4. 臨床判讀與 ISUOG 聲明模組
  // ==========================================

  function interpretCPR(percentile) {
    if (!Number.isFinite(percentile)) {
      return { status: 'unverified', statusText: '待輸入有效數值', statement: '尚未產生有效百分位數。' };
    }
    if (percentile < 5.0) {
      return {
        status: 'abnormal',
        statusText: '⚠️ 低於第 5 百分位 (參考值)',
        statement: '異常低 CPR（<5th centile），符合腦血流重新分佈／腦保護模式。依據 ISUOG 2020 指引，應結合生長指標、羊水量與都卜勒整體多模態綜合評估，不得單憑此數值獨立診斷。'
      };
    }
    if (percentile < 10.0) {
      return {
        status: 'borderline',
        statusText: '臨界區間（第 5–10 百分位）',
        statement: 'CPR 在該懷孕週數參考範圍內，屬臨界偏低區間（5th–10th centile）。'
      };
    }
    return {
      status: 'normal',
      statusText: '常態區間（≥ 第 5 百分位）',
      statement: 'CPR 在該懷孕週數參考範圍內（CPR within gestational-age reference range）。'
    };
  }

  // ==========================================
  // 5. FMF 2019 參考模型規範
  // ==========================================

  const CPR_COEFFICIENTS = {
    source: 'Ciobanu et al. 2019, DOI: 10.1002/uog.20157',
    parameter: 'Cerebroplacental Ratio (CPR = MCA PI / UA PI)',
    isVerified: false,
    verificationStatus: '研究與測試參考模型 (待官方 Table S1 完全核驗)',
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
    const z90 = 1.644853;
    const centile5 = Math.pow(10, logMedian - (z90 * sd));
    const centile95 = Math.pow(10, logMedian + (z90 * sd));

    return {
      median,
      expectedMedian: median,
      sd,
      centile5,
      centile50: median,
      centile95,
      calculateZScore: (measured) => calculateZScore(measured, median, sd, true),
      calculatePercentile: (measured) => {
        const z = calculateZScore(measured, median, sd, true);
        return zScoreToPercentile(z);
      }
    };
  }

  // ==========================================
  // 6. 資料庫儲存層 (PatientStore)
  // ==========================================

  const STORAGE_KEY = 'fetal_doppler_patients_v1';

  class PatientStore {
    static getAll() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    static getPatientRecords(mrn) {
      if (!mrn) return [];
      const cleanMRN = mrn.trim().toUpperCase();
      const all = this.getAll();
      const patient = all[cleanMRN];
      if (!patient || !patient.records) return [];

      return patient.records.slice().sort((a, b) => {
        if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
          return a.timestamp.localeCompare(b.timestamp);
        }
        return a.gaDecimal - b.gaDecimal;
      });
    }

    static saveMeasurement(mrn, entry, patientEdd) {
      if (!mrn || !mrn.trim()) throw new Error('請輸入有效病歷號');
      if (!entry || typeof entry !== 'object') throw new TypeError('測量紀錄資料格式錯誤');

      const weeks = Number(entry.weeks);
      const days = Number(entry.days);
      const mca = Number(entry.mcaPI);
      const uma = Number(entry.umaPI);
      const cpr = Number(entry.cpr);
      const centile = Number(entry.centile);

      if (!Number.isInteger(weeks) || weeks < 20 || weeks > 42) {
        throw new RangeError(`懷孕週數無效 (${entry.weeks})：必須為 20 至 42 週之整數`);
      }
      if (!Number.isInteger(days) || days < 0 || days > 6) {
        throw new RangeError(`天數無效 (${entry.days})：必須為 0 至 6 天之整數`);
      }
      if (!Number.isFinite(mca) || mca <= 0) throw new RangeError(`MCA PI 無效 (${entry.mcaPI})：必須大於 0`);
      if (!Number.isFinite(uma) || uma <= 0) throw new RangeError(`UA PI 無效 (${entry.umaPI})：必須大於 0`);
      if (!Number.isFinite(cpr) || cpr <= 0) throw new RangeError(`CPR 數值無效 (${entry.cpr})：必須大於 0`);
      if (!Number.isFinite(centile) || centile < 0 || centile > 100) {
        throw new RangeError(`百分位數無效 (${entry.centile})：必須落於 0 至 100 之間`);
      }

      const cleanMRN = mrn.trim().toUpperCase();
      const all = this.getAll();

      if (!all[cleanMRN]) {
        all[cleanMRN] = {
          mrn: cleanMRN,
          edd: patientEdd || entry.edd || '',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          records: []
        };
      } else if (patientEdd) {
        all[cleanMRN].edd = patientEdd;
      }

      const now = new Date();
      const formattedTime = (entry.timestamp && String(entry.timestamp).trim()) ?
        String(entry.timestamp).trim() :
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 重複儲存防護
      const existing = all[cleanMRN].records || [];
      const isDuplicate = existing.some(r => {
        return r.timestamp === formattedTime &&
          Math.abs(r.gaDecimal - entry.gaDecimal) < 0.01 &&
          Math.abs(r.cpr - cpr) < 0.01;
      });

      if (isDuplicate) {
        throw new Error('此時間點已有完全相同懷孕週數與 CPR 之量測紀錄，請勿重複儲存。');
      }

      const recordUUID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ?
        crypto.randomUUID() :
        ('rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

      const newRecord = {
        id: recordUUID,
        timestamp: formattedTime,
        weeks,
        days,
        gaDecimal: weeks + (days / 7),
        mcaPI: mca,
        umaPI: uma,
        cpr,
        centile,
        isAbnormal: centile < 5.0,
        edd: patientEdd || all[cleanMRN].edd || '',
        modelVersion: entry.modelVersion || 'FMF-2019-Ciobanu-Research'
      };

      all[cleanMRN].records.push(newRecord);
      all[cleanMRN].lastUpdated = new Date().toISOString();

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch (e) {
        throw new Error('本地磁碟空間不足或儲存失敗');
      }

      return this.getPatientRecords(cleanMRN);
    }

    static deleteRecord(mrn, recordId) {
      if (!mrn) return [];
      const cleanMRN = mrn.trim().toUpperCase();
      const all = this.getAll();
      if (all[cleanMRN] && all[cleanMRN].records) {
        all[cleanMRN].records = all[cleanMRN].records.filter(r => r.id !== recordId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      return this.getPatientRecords(cleanMRN);
    }

    static listPatients() {
      const all = this.getAll();
      return Object.keys(all).map(mrn => ({
        mrn,
        count: all[mrn].records ? all[mrn].records.length : 0,
        lastDate: all[mrn].lastUpdated ? all[mrn].lastUpdated.split('T')[0] : ''
      })).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    }
  }

  // =========================================================================
  // 7. UI 主控制器與狀態管理 (Application Controller)
  // =========================================================================

  let activeMRN = '';
  let loadedPatientMRN = '';
  let currentCalc = {
    isValid: true,
    weeks: 28,
    days: 4,
    gaDecimal: 28.57,
    mcaPI: 1.79,
    umaPI: 0.88,
    cpr: 2.03,
    centile: 72.8,
    isAbnormal: false
  };

  let toastTimeout = null;
  function showToast(message, type, duration) {
    const toastType = type || 'info';
    const toastDuration = duration || 3000;
    const el = document.getElementById('app-toast');
    if (!el) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    el.textContent = message;
    el.className = `app-toast toast-${toastType}`;
    el.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, toastDuration);
  }

  function updateAutoTime(force) {
    const timeInput = document.getElementById('input-measurement-time');
    if (!timeInput) return '';
    if (!force && timeInput.value && timeInput.value.trim().length >= 10) {
      return timeInput.value.trim();
    }
    const now = new Date();
    const str = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    timeInput.value = str;
    return str;
  }

  function syncGAFromEDD(showAlert) {
    const eddInput = document.getElementById('input-patient-edd');
    const timeInput = document.getElementById('input-measurement-time');
    const badge = document.getElementById('ga-auto-badge');
    const cluster = document.querySelector('.ga-input-cluster');

    const eddVal = eddInput ? eddInput.value.trim() : '';
    if (!eddVal) {
      if (badge) badge.classList.add('hidden');
      if (showAlert) {
        showToast('⚠️ 請先在預產期欄位輸入日期 (例如 2026-11-20 或 11/20)', 'error');
        eddInput?.focus();
      }
      return false;
    }

    const measureVal = (timeInput && timeInput.value.trim()) ? timeInput.value.trim().split(' ')[0] : '';
    const now = new Date();
    const defaultMeasure = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const measureDateStr = measureVal || defaultMeasure;

    const res = calculateGAFromEDD(eddVal, measureDateStr);
    if (!res.isValid) {
      if (badge) {
        badge.textContent = `⚠️ ${res.error}`;
        badge.classList.remove('hidden');
        badge.style.color = '#ef4444';
      }
      eddInput?.classList.add('input-error');
      if (showAlert) {
        showToast(`⚠️ 換算失敗：${res.error}`, 'error', 4000);
      }
      return false;
    }

    eddInput?.classList.remove('input-error');
    const wInput = document.getElementById('input-ga-weeks');
    const dInput = document.getElementById('input-ga-days');
    if (wInput) wInput.value = res.weeks;
    if (dInput) dInput.value = res.days;

    if (badge) {
      badge.textContent = `⚡ 由預產期推算：${res.weeks}週+${res.days}天`;
      badge.classList.remove('hidden');
      badge.style.color = '#10b981';
    }

    if (cluster) {
      cluster.classList.remove('highlight-flash');
      void cluster.offsetWidth; // force DOM reflow
      cluster.classList.add('highlight-flash');
    }

    if (showAlert) {
      showToast(`✓ 預產期換算成功：${res.weeks} 週 + ${res.days} 天！`, 'success', 3500);
    }
    return true;
  }

  function recalculate() {
    const mrnInput = document.getElementById('input-patient-mrn');
    activeMRN = mrnInput ? mrnInput.value.trim().toUpperCase() : '';

    const wVal = document.getElementById('input-ga-weeks')?.value;
    const dVal = document.getElementById('input-ga-days')?.value;
    const mcaVal = document.getElementById('input-mca-pi')?.value;
    const umaVal = document.getElementById('input-uma-pi')?.value;

    const errorGaEl = document.getElementById('error-ga');
    const errorMcaEl = document.getElementById('error-mca');
    const errorUmaEl = document.getElementById('error-uma');
    const wInput = document.getElementById('input-ga-weeks');
    const mcaInput = document.getElementById('input-mca-pi');
    const umaInput = document.getElementById('input-uma-pi');
    const saveBtn = document.getElementById('btn-save-measurement');

    // 1. 嚴格驗證 GA (Fail-Closed)
    const gaRes = validateGestationalAge(wVal, dVal);
    if (!gaRes.isValid) {
      if (errorGaEl) {
        errorGaEl.textContent = gaRes.error || '週數或天數無效';
        errorGaEl.classList.remove('hidden');
      }
      wInput?.classList.add('input-error');
    } else {
      if (errorGaEl) {
        if (gaRes.warning) {
          errorGaEl.textContent = gaRes.warning;
          errorGaEl.classList.remove('hidden');
        } else {
          errorGaEl.textContent = '';
          errorGaEl.classList.add('hidden');
        }
      }
      wInput?.classList.remove('input-error');
    }

    // 2. 嚴格驗證 Doppler (Fail-Closed)
    const dopplerRes = validateDopplerInputs(mcaVal, umaVal);
    if (dopplerRes.errors.mcaPI) {
      if (errorMcaEl) {
        errorMcaEl.textContent = dopplerRes.errors.mcaPI;
        errorMcaEl.classList.remove('hidden');
      }
      mcaInput?.classList.add('input-error');
    } else {
      if (errorMcaEl) errorMcaEl.classList.add('hidden');
      mcaInput?.classList.remove('input-error');
    }

    if (dopplerRes.errors.uaPI) {
      if (errorUmaEl) {
        errorUmaEl.textContent = dopplerRes.errors.uaPI;
        errorUmaEl.classList.remove('hidden');
      }
      umaInput?.classList.add('input-error');
    } else {
      if (errorUmaEl) errorUmaEl.classList.add('hidden');
      umaInput?.classList.remove('input-error');
    }

    const isAllValid = gaRes.isValid && dopplerRes.isValid;
    if (!isAllValid) {
      currentCalc.isValid = false;
      document.getElementById('display-cpr-num').textContent = '—';
      document.getElementById('display-cpr-centile').textContent = '—';
      const badge = document.getElementById('display-cpr-status-badge');
      badge.className = 'ios-badge badge-stable';
      badge.textContent = '待輸入有效數值';

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-disabled');
      }
      updatePatientStateAndTrend();
      return;
    }

    // 有效數值計算
    const cpr = calculateCPR(dopplerRes.mcaPI, dopplerRes.uaPI);
    const cprRef = getCPRReference(gaRes.decimalWeeks);
    const centile = cprRef.calculatePercentile(cpr);
    const isAbnormal = Number.isFinite(centile) && centile < 5.0;

    currentCalc.isValid = true;
    currentCalc.weeks = gaRes.weeks;
    currentCalc.days = gaRes.days;
    currentCalc.gaDecimal = gaRes.decimalWeeks;
    currentCalc.mcaPI = dopplerRes.mcaPI;
    currentCalc.umaPI = dopplerRes.uaPI;
    currentCalc.cpr = cpr;
    currentCalc.centile = centile;
    currentCalc.isAbnormal = isAbnormal;

    document.getElementById('display-cpr-num').textContent = formatCPRForDisplay(cpr);
    const pText = Number.isFinite(centile) ?
      (centile < 1.0 ? '< 1%' : (centile > 99.0 ? '> 99%' : `${centile.toFixed(1)}%`)) :
      '—';
    document.getElementById('display-cpr-centile').textContent = pText;

    const interp = interpretCPR(centile);
    const badge = document.getElementById('display-cpr-status-badge');
    badge.className = interp.status === 'abnormal' ? 'ios-badge badge-abnormal' : 'ios-badge badge-normal';
    badge.textContent = interp.statusText;

    if (saveBtn) {
      saveBtn.disabled = !activeMRN;
      if (activeMRN) {
        saveBtn.classList.remove('btn-disabled');
      } else {
        saveBtn.classList.add('btn-disabled');
      }
    }

    updatePatientStateAndTrend();
  }

  function updatePatientStateAndTrend() {
    const navIndicator = document.getElementById('nav-patient-indicator');
    const trendBadge = document.getElementById('display-trend-badge');
    const listMount = document.getElementById('history-list-mount');
    const historyTitle = document.getElementById('history-header-title');

    if (!activeMRN) {
      navIndicator.textContent = '未指定病歷號（新病患）';
      navIndicator.className = 'nav-patient-indicator text-muted';
      trendBadge.className = 'trend-badge badge-stable';
      trendBadge.textContent = '新病患紀錄';
      historyTitle.textContent = '📅 追蹤歷程 (未建檔)';
      listMount.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'history-empty';
      emptyDiv.textContent = '請輸入病歷號建立專屬檔案，或點「儲存」自動歸檔。';
      listMount.appendChild(emptyDiv);
      return;
    }

    navIndicator.textContent = `現正檢視病歷號：[${activeMRN}]`;
    navIndicator.className = 'nav-patient-indicator text-active';

    const records = PatientStore.getPatientRecords(activeMRN);
    historyTitle.textContent = `📅 [${activeMRN}] 追蹤歷程 (${records.length} 次測量)`;

    if (records.length === 0) {
      trendBadge.className = 'trend-badge badge-stable';
      trendBadge.textContent = '新病患（無對比）';
      listMount.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'history-empty';
      emptyDiv.textContent = `病歷號 [${activeMRN}] 尚無歷史紀錄。請輸入有效數值後點擊儲存為第 1 次測量。`;
      listMount.appendChild(emptyDiv);
    } else if (records.length === 1) {
      const first = records[0];
      const isSame = currentCalc.isValid &&
        Math.abs(currentCalc.gaDecimal - first.gaDecimal) < 0.05 &&
        Math.abs(currentCalc.cpr - first.cpr) < 0.02;

      if (isSame) {
        trendBadge.className = 'trend-badge badge-stable';
        trendBadge.textContent = '第 1 次基線量測（尚無前次對比）';
      } else if (currentCalc.isValid) {
        const delta = currentCalc.centile - first.centile;
        if (delta <= -20) {
          trendBadge.className = 'trend-badge badge-danger';
          trendBadge.textContent = `⚠️ 預覽 vs 第1次：急降 ${delta.toFixed(0)}%`;
        } else if (delta < -10) {
          trendBadge.className = 'trend-badge badge-warning';
          trendBadge.textContent = `📉 預覽 vs 第1次：下降 ${delta.toFixed(0)}%`;
        } else if (delta > 5) {
          trendBadge.className = 'trend-badge badge-up';
          trendBadge.textContent = `📈 預覽 vs 第1次：上升 (+${delta.toFixed(0)}%)`;
        } else {
          trendBadge.className = 'trend-badge badge-stable';
          trendBadge.textContent = `預覽 vs 第1次：平穩 (${delta > 0 ? '+' : ''}${delta.toFixed(0)}%)`;
        }
      } else {
        trendBadge.className = 'trend-badge badge-stable';
        trendBadge.textContent = '第 1 次基線量測（尚無前次對比）';
      }
      renderHistoryList(records);
    } else {
      const latest = records[records.length - 1];
      const prev = records[records.length - 2];
      const delta = latest.centile - prev.centile;

      if (delta <= -20) {
        trendBadge.className = 'trend-badge badge-danger';
        trendBadge.textContent = `⚠️ 第${records.length}次 vs 第${records.length - 1}次：急降 ${delta.toFixed(0)}%`;
      } else if (delta < -10) {
        trendBadge.className = 'trend-badge badge-warning';
        trendBadge.textContent = `📉 第${records.length}次 vs 第${records.length - 1}次：下降 ${delta.toFixed(0)}%`;
      } else if (delta > 5) {
        trendBadge.className = 'trend-badge badge-up';
        trendBadge.textContent = `📈 第${records.length}次 vs 第${records.length - 1}次：上升 (+${delta.toFixed(0)}%)`;
      } else {
        trendBadge.className = 'trend-badge badge-stable';
        trendBadge.textContent = `第${records.length}次 vs 第${records.length - 1}次：平穩 (${delta > 0 ? '+' : ''}${delta.toFixed(0)}%)`;
      }
      renderHistoryList(records);
    }

    updateRecentPatientsDropdown();
  }

  function renderHistoryList(records) {
    const listMount = document.getElementById('history-list-mount');
    listMount.textContent = '';

    const rev = records.slice().reverse();
    rev.forEach((r, idx) => {
      const itemIdx = records.length - idx;
      const isAb = r.centile < 5.0;

      const itemDiv = document.createElement('div');
      itemDiv.className = 'history-item';
      itemDiv.style.flexDirection = 'column';
      itemDiv.style.alignItems = 'stretch';

      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.justifyContent = 'space-between';
      rowDiv.style.alignItems = 'center';
      rowDiv.style.width = '100%';

      const leftDiv = document.createElement('div');
      leftDiv.className = 'history-item-left';

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `history-badge ${isAb ? 'badge-abnormal' : 'badge-normal'}`;
      badgeSpan.textContent = `第 ${itemIdx} 次`;

      const gaSpan = document.createElement('span');
      gaSpan.className = 'history-ga';
      gaSpan.textContent = `${r.weeks}+${r.days} 週 (${r.gaDecimal.toFixed(1)}w)`;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'history-time';
      timeSpan.textContent = r.timestamp || '';

      leftDiv.appendChild(badgeSpan);
      leftDiv.appendChild(gaSpan);
      leftDiv.appendChild(timeSpan);

      const rightDiv = document.createElement('div');
      rightDiv.className = 'history-item-right';

      const cprSpan = document.createElement('span');
      cprSpan.className = 'history-cpr';
      cprSpan.textContent = `CPR ${r.cpr.toFixed(2)}`;

      const centileSpan = document.createElement('span');
      centileSpan.className = `history-centile ${isAb ? 'text-rose' : 'text-emerald'}`;
      centileSpan.textContent = `${r.centile.toFixed(1)}%`;

      const detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'btn-detail-toggle';
      detailBtn.textContent = '詳細 ▾';

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-del-rec';
      delBtn.textContent = '✕';
      delBtn.title = '刪除此筆量測';

      rightDiv.appendChild(cprSpan);
      rightDiv.appendChild(centileSpan);
      rightDiv.appendChild(detailBtn);
      rightDiv.appendChild(delBtn);

      rowDiv.appendChild(leftDiv);
      rowDiv.appendChild(rightDiv);
      itemDiv.appendChild(rowDiv);

      const detailPanel = document.createElement('div');
      detailPanel.className = 'record-detail-panel hidden';
      detailPanel.innerHTML = `
        <div><b>大腦中動脈 MCA PI:</b> ${r.mcaPI ? r.mcaPI.toFixed(2) : '—'} ｜ <b>臍動脈 UA PI:</b> ${r.umaPI ? r.umaPI.toFixed(2) : '—'}</div>
        <div><b>預產期 (EDD):</b> ${r.edd || '無記錄'} ｜ <b>模型版本:</b> ${r.modelVersion || 'FMF-2019-Ciobanu'}</div>
        <div style="font-size: 0.68rem; color: #94a3b8;"><b>識別碼 (UUID):</b> ${r.id}</div>
      `;
      itemDiv.appendChild(detailPanel);

      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = detailPanel.classList.contains('hidden');
        if (isHidden) {
          detailPanel.classList.remove('hidden');
          detailBtn.textContent = '收起 ▴';
        } else {
          detailPanel.classList.add('hidden');
          detailBtn.textContent = '詳細 ▾';
        }
      });

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除病歷 [${activeMRN}] 的第 ${itemIdx} 次測量紀錄嗎？`)) {
          PatientStore.deleteRecord(activeMRN, r.id);
          recalculate();
          renderLandscapeChart();
        }
      });

      listMount.appendChild(itemDiv);
    });
  }

  function updateRecentPatientsDropdown() {
    const sel = document.getElementById('select-recent-patients');
    if (!sel) return;
    const patients = PatientStore.listPatients();
    const current = sel.value;
    let opts = `<option value="">📂 載入既有病歷檔案 (${patients.length} 位)...</option>`;
    patients.forEach(p => {
      opts += `<option value="${p.mrn}">病歷: ${p.mrn} (${p.count} 次量測)</option>`;
    });
    sel.innerHTML = opts;
    if (current) sel.value = current;
  }

  function loadPatientData(mrn) {
    if (!mrn) return;
    activeMRN = mrn.trim().toUpperCase();
    loadedPatientMRN = activeMRN;
    document.getElementById('input-patient-mrn').value = activeMRN;

    const noticeEl = document.getElementById('notice-patient');
    if (noticeEl) noticeEl.classList.add('hidden');

    const all = PatientStore.getAll();
    const patient = all[activeMRN];
    if (patient && patient.edd) {
      document.getElementById('input-patient-edd').value = patient.edd;
    } else {
      document.getElementById('input-patient-edd').value = '';
    }

    const records = PatientStore.getPatientRecords(activeMRN);
    if (records.length > 0) {
      const latest = records[records.length - 1];
      document.getElementById('input-ga-weeks').value = latest.weeks;
      document.getElementById('input-ga-days').value = latest.days;
      document.getElementById('input-mca-pi').value = latest.mcaPI;
      document.getElementById('input-uma-pi').value = latest.umaPI;
      if (latest.timestamp) {
        document.getElementById('input-measurement-time').value = latest.timestamp;
      }
    }
    syncGAFromEDD(false);
    recalculate();
  }

  function startNewPatient() {
    document.getElementById('input-patient-mrn').value = '';
    document.getElementById('input-patient-edd').value = '';
    document.getElementById('select-recent-patients').value = '';
    activeMRN = '';
    loadedPatientMRN = '';

    document.getElementById('input-ga-weeks').value = '28';
    document.getElementById('input-ga-days').value = '0';
    document.getElementById('input-mca-pi').value = '1.75';
    document.getElementById('input-uma-pi').value = '0.85';

    const badge = document.getElementById('ga-auto-badge');
    if (badge) badge.classList.add('hidden');
    const noticeEl = document.getElementById('notice-patient');
    if (noticeEl) noticeEl.classList.add('hidden');

    updateAutoTime(true);
    recalculate();
    showToast('已清空欄位，請輸入新病歷號。', 'info');
    document.getElementById('input-patient-mrn').focus();
  }

  function renderLandscapeChart(scrubGA) {
    const container = document.getElementById('landscape-chart-mount');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || 740, 640);
    const height = Math.max(rect.height || 380, 320);

    const padding = { top: 25, right: 40, bottom: 35, left: 45 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const minX = 20;
    const maxX = 42;
    let minY = 0.4;
    let maxY = 3.0;

    const savedRecords = activeMRN ? PatientStore.getPatientRecords(activeMRN) : [];
    const allPoints = savedRecords.slice();

    const isCurrentAlreadySaved = savedRecords.some(r => {
      return currentCalc.isValid &&
        Math.abs(r.gaDecimal - currentCalc.gaDecimal) < 0.05 &&
        Math.abs(r.cpr - currentCalc.cpr) < 0.02;
    });

    if (currentCalc.isValid && !isCurrentAlreadySaved && activeMRN) {
      allPoints.push({
        gaDecimal: currentCalc.gaDecimal,
        cpr: currentCalc.cpr,
        centile: currentCalc.centile,
        isAbnormal: currentCalc.isAbnormal,
        isCurrentPreview: true,
        weeks: currentCalc.weeks,
        days: currentCalc.days,
        timestamp: '當前預覽'
      });
    } else if (currentCalc.isValid && allPoints.length === 0) {
      allPoints.push({
        gaDecimal: currentCalc.gaDecimal,
        cpr: currentCalc.cpr,
        centile: currentCalc.centile,
        isAbnormal: currentCalc.isAbnormal,
        weeks: currentCalc.weeks,
        days: currentCalc.days,
        timestamp: '當前實測'
      });
    }

    allPoints.forEach(pt => {
      if (pt.cpr < minY) minY = 0.1;
      if (pt.cpr > maxY) maxY = Math.ceil(pt.cpr * 1.15 * 10) / 10;
    });

    const sx = (ga) => padding.left + ((ga - minX) / (maxX - minX)) * plotW;
    const sy = (cpr) => padding.top + plotH - ((cpr - minY) / (maxY - minY)) * plotH;
    const invX = (px) => minX + ((px - padding.left) / plotW) * (maxX - minX);

    let gridX = '';
    for (let w = 20; w <= 42; w += 2) {
      const x = sx(w).toFixed(1);
      gridX += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotH}" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3"/>` +
               `<text x="${x}" y="${padding.top + plotH + 18}" font-size="10" fill="#64748b" text-anchor="middle">${w}w</text>`;
    }

    let gridY = '';
    for (let v = 0.5; v <= maxY; v += 0.5) {
      if (v < minY) continue;
      const y = sy(v).toFixed(1);
      gridY += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotW}" y2="${y}" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3"/>` +
               `<text x="${padding.left - 8}" y="${y}" font-size="10" fill="#64748b" text-anchor="end" dominant-baseline="middle">${v.toFixed(1)}</text>`;
    }

    let path50 = '', path5 = '', path95 = '';
    for (let ga = 20; ga <= 42; ga += 0.5) {
      const ref = getCPRReference(ga);
      const x = sx(ga).toFixed(1);
      const y50 = sy(ref.median).toFixed(1);
      const y5 = sy(ref.centile5).toFixed(1);
      const y95 = sy(ref.centile95).toFixed(1);
      const cmd = ga === 20 ? 'M' : 'L';
      path50 += `${cmd} ${x} ${y50} `;
      path5 += `${cmd} ${x} ${y5} `;
      path95 += `${cmd} ${x} ${y95} `;
    }

    let trajectoryPath = '';
    let trajectoryGlow = '';
    let trajectoryMarkers = '';

    if (allPoints.length >= 2 && activeMRN) {
      const pathCommands = allPoints.map((pt, idx) => {
        const px = sx(pt.gaDecimal).toFixed(1);
        const py = sy(pt.cpr).toFixed(1);
        return (idx === 0 ? 'M' : 'L') + ` ${px} ${py}`;
      }).join(' ');

      trajectoryGlow = `<path d="${pathCommands}" fill="none" stroke="#38bdf8" stroke-width="6" opacity="0.25" stroke-linecap="round" stroke-linejoin="round"/>`;
      trajectoryPath = `<path d="${pathCommands}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4,2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    allPoints.forEach((pt, idx) => {
      const px = sx(pt.gaDecimal);
      const py = sy(pt.cpr);
      const isAb = pt.centile < 5.0;
      const ptColor = isAb ? '#ff453a' : '#30d158';
      const isCur = !!pt.isCurrentPreview;
      const nodeLabel = (allPoints.length > 1 && activeMRN) ?
        (isCur ? '當前預覽' : `第${idx + 1}次 (${pt.weeks}w)`) :
        `${pt.weeks}w 實測`;

      trajectoryMarkers += `
        <g class="trajectory-node">
          <circle cx="${px}" cy="${py}" r="${isCur ? '7' : '5'}" fill="${ptColor}" stroke="#ffffff" stroke-width="2"/>
          <text x="${px}" y="${py - 10}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">
            ${nodeLabel}
          </text>
        </g>`;
    });

    let scrubberMarkup = '';
    if (typeof scrubGA === 'number' && scrubGA >= minX && scrubGA <= maxX) {
      const sX = sx(scrubGA);
      const sRef = getCPRReference(scrubGA);
      scrubberMarkup = `<line x1="${sX}" y1="${padding.top}" x2="${sX}" y2="${padding.top + plotH}" stroke="#38bdf8" stroke-width="1.5"/>` +
                       `<circle cx="${sX}" cy="${sy(sRef.median)}" r="4" fill="#38bdf8" stroke="#ffffff"/>` +
                       `<circle cx="${sX}" cy="${sy(sRef.centile5)}" r="4" fill="#ff453a" stroke="#ffffff"/>`;

      document.getElementById('ls-trend-text').innerHTML =
        `探針：<b>${scrubGA.toFixed(1)}週</b> ｜ 中位數: <b>${sRef.median.toFixed(2)}</b> ｜ 5th門檻: <b class="text-rose-400">${sRef.centile5.toFixed(2)}</b>`;
    } else {
      if (allPoints.length >= 2 && activeMRN) {
        const first = allPoints[0];
        const last = allPoints[allPoints.length - 1];
        const diffP = last.centile - first.centile;
        const isDrop = diffP < -15;
        document.getElementById('ls-trend-text').innerHTML =
          `📈 [${activeMRN}] 趨勢：共 ${allPoints.length} 個量測點 ｜ ` +
          (isDrop ? `<span class="text-rose-400 font-bold">(⚠️ 百分位降 ${Math.abs(diffP).toFixed(0)}%)</span>` : `<span class="text-emerald-400 font-bold">(趨勢平穩)</span>`);
      } else if (activeMRN) {
        document.getElementById('ls-trend-text').textContent = `病歷號 [${activeMRN}] 僅 1 次測量落點（尚未有縱向折線）`;
      } else {
        document.getElementById('ls-trend-text').textContent = '新病患獨立測量落點';
      }
    }

    document.getElementById('ls-patient-summary').textContent =
      activeMRN ? (`病歷號: [${activeMRN}] · 累積 ${savedRecords.length} 次測量`) : '新病患 · 單次實測落點';
    document.getElementById('ls-status-dot').className =
      currentCalc.isAbnormal ? 'ls-dot-indicator dot-abnormal' : 'ls-dot-indicator dot-normal';

    container.innerHTML = `
      <svg id="interactive-svg" viewBox="0 0 ${width} ${height}" class="ls-svg" preserveAspectRatio="xMidYMid meet">
        <rect x="${padding.left}" y="${padding.top}" width="${plotW}" height="${plotH}" fill="#090d16" rx="6"/>
        ${gridX}
        ${gridY}
        <path d="${path95}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>
        <path d="${path50}" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <path d="${path5}" fill="none" stroke="#ff453a" stroke-width="2"/>
        ${trajectoryGlow}
        ${trajectoryPath}
        ${trajectoryMarkers}
        ${scrubberMarkup}
        <text x="${padding.left + plotW / 2}" y="${height - 6}" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">懷孕週數 (Gestational Age, weeks)</text>
        <text transform="rotate(-90)" x="${-(padding.top + plotH / 2)}" y="14" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">CPR 數值</text>
      </svg>
    `;

    const svg = document.getElementById('interactive-svg');
    if (svg) {
      function handleMove(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rectSvg = svg.getBoundingClientRect();
        const relX = clientX - rectSvg.left;
        const svgX = (relX / rectSvg.width) * width;
        if (svgX >= padding.left && svgX <= padding.left + plotW) {
          renderLandscapeChart(invX(svgX));
        }
      }
      svg.addEventListener('mousemove', handleMove);
      svg.addEventListener('touchmove', handleMove, { passive: true });
    }
  }

  function setMode(isLandscape) {
    const port = document.getElementById('container-portrait');
    const land = document.getElementById('container-landscape');
    if (isLandscape) {
      port.style.display = 'none';
      land.style.display = 'flex';
      renderLandscapeChart();
    } else {
      land.style.display = 'none';
      port.style.display = 'block';
    }
  }

  const inputIds = ['input-patient-mrn', 'input-patient-edd', 'input-measurement-time', 'input-ga-weeks', 'input-ga-days', 'input-mca-pi', 'input-uma-pi'];
  const inputLabels = {
    'input-patient-mrn': '病歷號',
    'input-patient-edd': '預產期 (EDD)',
    'input-measurement-time': '量測時間',
    'input-ga-weeks': '懷孕週數 (週)',
    'input-ga-days': '懷孕週數 (天)',
    'input-mca-pi': 'MCA PI (大腦中動脈)',
    'input-uma-pi': 'UmA PI (臍動脈)'
  };
  let currentFocusedInput = null;

  function showKeyboardToolbar(inputEl) {
    currentFocusedInput = inputEl;
    const bar = document.getElementById('ios-kb-toolbar');
    const label = document.getElementById('kb-current-label');
    if (bar && label) {
      label.textContent = `${inputLabels[inputEl.id] || '欄位'} 輸入中...`;
      bar.classList.remove('hidden');
    }
  }

  function dismissKeyboard() {
    const bar = document.getElementById('ios-kb-toolbar');
    if (bar) bar.classList.add('hidden');
    if (currentFocusedInput) {
      currentFocusedInput.blur();
      currentFocusedInput = null;
    }
  }

  function focusNextField() {
    if (!currentFocusedInput) return;
    const idx = inputIds.indexOf(currentFocusedInput.id);
    if (idx !== -1 && idx < inputIds.length - 1) {
      const nextEl = document.getElementById(inputIds[idx + 1]);
      if (nextEl) nextEl.focus();
    } else {
      dismissKeyboard();
    }
  }

  function attachEvents() {
    ['input', 'change', 'keyup'].forEach(evt => {
      document.getElementById('input-ga-weeks')?.addEventListener(evt, recalculate);
      document.getElementById('input-ga-days')?.addEventListener(evt, recalculate);
      document.getElementById('input-mca-pi')?.addEventListener(evt, recalculate);
      document.getElementById('input-uma-pi')?.addEventListener(evt, recalculate);
    });

    document.getElementById('input-patient-mrn')?.addEventListener('input', function () {
      const typed = this.value.trim().toUpperCase();
      activeMRN = typed;
      const noticeEl = document.getElementById('notice-patient');

      if (typed && typed !== loadedPatientMRN) {
        const all = PatientStore.getAll();
        if (all[typed]) {
          if (noticeEl) {
            noticeEl.textContent = `⚠️ 檢測到既有病歷 [${typed}]（有 ${all[typed].records?.length || 0} 筆紀錄）。點此載入該病患檔案 ➔`;
            noticeEl.classList.remove('hidden');
            noticeEl.style.cursor = 'pointer';
            noticeEl.onclick = () => loadPatientData(typed);
          }
        } else if (noticeEl) {
          noticeEl.classList.add('hidden');
        }
      } else if (noticeEl) {
        noticeEl.classList.add('hidden');
      }

      recalculate();
    });

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', function () {
        showKeyboardToolbar(this);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          focusNextField();
        }
      });
    });

    document.getElementById('btn-kb-next')?.addEventListener('click', focusNextField);
    document.getElementById('btn-kb-done')?.addEventListener('click', dismissKeyboard);

    document.addEventListener('click', function (e) {
      if (!e.target.closest('input, select, button, .ios-kb-toolbar')) {
        dismissKeyboard();
      }
    });

    document.getElementById('btn-new-patient')?.addEventListener('click', startNewPatient);

    document.getElementById('select-recent-patients')?.addEventListener('change', function (e) {
      if (e.target.value) {
        loadPatientData(e.target.value);
      }
    });

    document.getElementById('btn-save-measurement')?.addEventListener('click', function () {
      dismissKeyboard();
      const mrnField = document.getElementById('input-patient-mrn');
      let enteredMRN = mrnField ? mrnField.value.trim().toUpperCase() : '';
      if (!enteredMRN) {
        enteredMRN = prompt('請輸入此病患之病歷號 (MRN)：');
        if (!enteredMRN || !enteredMRN.trim()) {
          showToast('⚠️ 未輸入病歷號，未儲存紀錄。', 'error');
          return;
        }
        enteredMRN = enteredMRN.trim().toUpperCase();
        if (mrnField) mrnField.value = enteredMRN;
      }

      if (!currentCalc.isValid) {
        showToast('⚠️ 當前數值無效或不完整，請修正紅色標記欄位。', 'error');
        return;
      }

      const eddVal = (document.getElementById('input-patient-edd')?.value || '').trim();
      const timeStr = (document.getElementById('input-measurement-time')?.value || '').trim() || updateAutoTime(true);

      try {
        const updated = PatientStore.saveMeasurement(enteredMRN, {
          weeks: currentCalc.weeks,
          days: currentCalc.days,
          gaDecimal: currentCalc.gaDecimal,
          mcaPI: currentCalc.mcaPI,
          umaPI: currentCalc.umaPI,
          cpr: currentCalc.cpr,
          centile: currentCalc.centile,
          isAbnormal: currentCalc.isAbnormal,
          timestamp: timeStr,
          edd: eddVal
        }, eddVal);

        showToast(`✓ 已成功儲存至病歷號 [${enteredMRN}]！(累積 ${updated.length} 次追蹤)`, 'success', 3500);
        loadedPatientMRN = enteredMRN;
        recalculate();
        renderLandscapeChart();
      } catch (err) {
        showToast(`⚠️ 儲存失敗：${err.message}`, 'error', 4500);
      }
    });

    function handleDateSync(showAlert) {
      if (syncGAFromEDD(showAlert)) {
        recalculate();
      }
    }

    const calcBtn = document.getElementById('btn-calc-ga');
    calcBtn?.addEventListener('click', function () {
      calcBtn.style.transform = 'scale(0.94)';
      setTimeout(() => { calcBtn.style.transform = ''; }, 150);
      handleDateSync(true);
    });

    ['input', 'change', 'keyup'].forEach(evtName => {
      document.getElementById('input-patient-edd')?.addEventListener(evtName, function () {
        handleDateSync(false);
      });
      document.getElementById('input-measurement-time')?.addEventListener(evtName, function () {
        handleDateSync(false);
      });
    });

    document.getElementById('btn-toggle-to-chart')?.addEventListener('click', function () {
      dismissKeyboard();
      setMode(true);
    });
    document.getElementById('btn-back-to-input')?.addEventListener('click', function () {
      setMode(false);
    });

    window.addEventListener('resize', function () {
      const isLandscape = window.innerWidth > window.innerHeight;
      setMode(isLandscape);
    });

    const nowBtn = document.getElementById('btn-now-time');
    nowBtn?.addEventListener('click', function () {
      nowBtn.style.transform = 'scale(0.94)';
      setTimeout(() => { nowBtn.style.transform = ''; }, 150);
      updateAutoTime(true);
      handleDateSync(false);
      showToast('已更新量測時間為當前時間。', 'info', 2000);
    });

    updateAutoTime(true);
    handleDateSync(false);
    recalculate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEvents);
  } else {
    attachEvents();
  }

})(typeof window !== 'undefined' ? window : this);
