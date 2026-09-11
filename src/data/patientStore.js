/**
 * 本機病歷號與 CPR 縱向追蹤資料庫
 * Zero-Cloud, 100% 儲存在使用者裝置本機 (LocalStorage / IndexedDB 規範)
 */

const STORAGE_KEY = 'fetal_doppler_patients_v1';

export class PatientStore {
  /**
   * 取得所有病患清單
   * @returns {Object.<string, { mrn: string, createdAt: string, lastUpdated: string, records: Array }>}
   */
  static getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('無法讀取本地儲存:', e);
      return {};
    }
  }

  /**
   * 取得特定病歷號的歷次紀錄
   * @param {string} mrn - 病歷號
   * @returns {Array} 依週數與時間排序的紀錄陣列
   */
  static getPatientRecords(mrn) {
    if (!mrn) return [];
    const all = this.getAll();
    const cleanMRN = mrn.trim().toUpperCase();
    const patient = all[cleanMRN];
    if (!patient || !patient.records) return [];

    // 依量測實際時間戳記升冪排序，時間相同時依週數排序
    return patient.records.slice().sort((a, b) => {
      if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
        return a.timestamp.localeCompare(b.timestamp);
      }
      return a.gaDecimal - b.gaDecimal;
    });
  }

  /**
   * 儲存單次測量紀錄至指定病歷號
   * 具備嚴格的 Fail-Closed Schema 驗證，拒絕任何無效數值寫入
   * @param {string} mrn - 病歷號
   * @param {{
   *   weeks: number,
   *   days: number,
   *   gaDecimal: number,
   *   mcaPI: number,
   *   umaPI: number,
   *   cpr: number,
   *   centile: number,
   *   isAbnormal: boolean,
   *   timestamp?: string,
   *   edd?: string,
   *   modelVersion?: string
   * }} entry
   * @param {string} [patientEdd] - 預產期
   * @returns {Array} 更新後的該病患紀錄清單
   */
  static saveMeasurement(mrn, entry, patientEdd = '') {
    if (!mrn || !mrn.trim()) {
      throw new Error('請輸入有效病歷號');
    }

    if (!entry || typeof entry !== 'object') {
      throw new TypeError('測量紀錄資料格式錯誤');
    }

    // Fail-Closed 嚴格 Schema 驗證
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
    if (!Number.isFinite(mca) || mca <= 0) {
      throw new RangeError(`MCA PI 無效 (${entry.mcaPI})：必須為大於 0 的正數`);
    }
    if (!Number.isFinite(uma) || uma <= 0) {
      throw new RangeError(`UA PI 無效 (${entry.umaPI})：必須為大於 0 的正數`);
    }
    if (!Number.isFinite(cpr) || cpr <= 0) {
      throw new RangeError(`CPR 數值無效 (${entry.cpr})：必須為大於 0 的正數`);
    }
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

    // 自動產生精確時間戳記 (例如 2026-09-03 08:35)
    const now = new Date();
    const formattedTime = (entry.timestamp && String(entry.timestamp).trim()) ?
      String(entry.timestamp).trim() :
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 重複量測防護 (相同 MRN + 相同量測時間 + 相同週數與 CPR)
    const existing = all[cleanMRN].records || [];
    const isDuplicate = existing.some(r => {
      const sameTime = r.timestamp === formattedTime;
      const sameGA = Math.abs(r.gaDecimal - entry.gaDecimal) < 0.01;
      const sameCPR = Math.abs(r.cpr - cpr) < 0.01;
      return sameTime && sameGA && sameCPR;
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
      weeks: weeks,
      days: days,
      gaDecimal: weeks + (days / 7),
      mcaPI: mca,
      umaPI: uma,
      cpr: cpr,
      centile: centile,
      isAbnormal: centile < 5.0,
      edd: patientEdd || all[cleanMRN].edd || '',
      modelVersion: entry.modelVersion || 'FMF-2019-Ciobanu-Research'
    };

    all[cleanMRN].records.push(newRecord);
    all[cleanMRN].lastUpdated = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('儲存紀錄失敗:', e);
      throw new Error('本地磁碟空間不足或儲存失敗');
    }

    return this.getPatientRecords(cleanMRN);
  }

  /**
   * 刪除特定一筆測量紀錄
   * @param {string} mrn
   * @param {string} recordId
   */
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

  /**
   * 取得所有病歷號清單 (提供快速自動完成或下拉選單)
   * @returns {Array<{ mrn: string, count: number, lastDate: string }>}
   */
  static listPatients() {
    const all = this.getAll();
    return Object.keys(all).map(mrn => ({
      mrn,
      count: all[mrn].records ? all[mrn].records.length : 0,
      lastDate: all[mrn].lastUpdated ? all[mrn].lastUpdated.split('T')[0] : ''
    })).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }
}
