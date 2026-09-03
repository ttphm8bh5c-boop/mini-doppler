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

    // 依懷孕週數 (gaDecimal) 升冪排序
    return patient.records.slice().sort((a, b) => a.gaDecimal - b.gaDecimal);
  }

  /**
   * 儲存單次測量紀錄至指定病歷號
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
   *   timestamp?: string
   * }} entry
   * @returns {Array} 更新後的該病患紀錄清單
   */
  static saveMeasurement(mrn, entry) {
    if (!mrn || !mrn.trim()) {
      throw new Error('請輸入有效病歷號');
    }

    const cleanMRN = mrn.trim().toUpperCase();
    const all = this.getAll();

    if (!all[cleanMRN]) {
      all[cleanMRN] = {
        mrn: cleanMRN,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        records: []
      };
    }

    // 自動產生精確時間戳記 (例如 2026-09-03 08:35)
    const now = new Date();
    const formattedTime = entry.timestamp ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: formattedTime,
      weeks: entry.weeks,
      days: entry.days,
      gaDecimal: entry.gaDecimal,
      mcaPI: entry.mcaPI,
      umaPI: entry.umaPI,
      cpr: entry.cpr,
      centile: entry.centile,
      isAbnormal: entry.isAbnormal
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
