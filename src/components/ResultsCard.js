/**
 * 統計結果卡片組件 (Statistical Results Card Component)
 * 顯示計算之 CPR、各項指標百分位數、預期中位數與視覺狀態指示
 */

import { formatCPRForDisplay } from '../clinical/calculateCPR.js';
import { formatPercentile } from '../clinical/statistics.js';

export function renderResultsCard(container) {
  container.innerHTML = `
    <div id="results-container" class="results-card empty-state">
      <div class="empty-placeholder">
        <span class="empty-icon">📊</span>
        <p>請於上方輸入懷孕週數與多普勒搏動指數，然後點擊<strong>「計算與臨床判讀」</strong>。</p>
      </div>
    </div>
  `;

  const resultsBox = container.querySelector('#results-container');

  return {
    clear: () => {
      resultsBox.className = 'results-card empty-state';
      resultsBox.innerHTML = `
        <div class="empty-placeholder">
          <span class="empty-icon">📊</span>
          <p>請於上方輸入懷孕週數與多普勒搏動指數，然後點擊<strong>「計算與臨床判讀」</strong>。</p>
        </div>
      `;
    },
    update: ({ cpr, cprEval, mcaEval, uaEval, gaDecimalWeeks }) => {
      resultsBox.className = 'results-card active-state';

      const renderStatusBadge = (status, text) => {
        let badgeClass = 'badge-normal';
        let icon = '✓';
        if (status === 'abnormal') {
          badgeClass = 'badge-abnormal';
          icon = '⚠️';
        } else if (status === 'borderline') {
          badgeClass = 'badge-borderline';
          icon = '⚡';
        } else if (status === 'unverified') {
          badgeClass = 'badge-unverified';
          icon = 'ℹ️';
        }
        return `<span class="status-badge ${badgeClass}"><span class="badge-icon">${icon}</span> ${text}</span>`;
      };

      const cprDisplay = formatCPRForDisplay(cpr);
      const cprCentileDisplay = cprEval?.percentile !== null && !Number.isNaN(cprEval?.percentile)
        ? formatPercentile(cprEval.percentile)
        : '<span class="text-amber">待 Table S1 驗證</span>';

      const mcaCentileDisplay = mcaEval?.percentile !== null && !Number.isNaN(mcaEval?.percentile)
        ? formatPercentile(mcaEval.percentile)
        : '<span class="text-amber">待 Table S1 驗證</span>';

      const uaCentileDisplay = uaEval?.percentile !== null && !Number.isNaN(uaEval?.percentile)
        ? formatPercentile(uaEval.percentile)
        : '—';

      const uaExpectedMedian = uaEval?.expectedMedian !== null && uaEval?.expectedMedian !== undefined
        ? uaEval.expectedMedian.toFixed(2)
        : '—';

      const uaZScore = uaEval?.zScore !== null && uaEval?.zScore !== undefined
        ? uaEval.zScore.toFixed(2)
        : '—';

      resultsBox.innerHTML = `
        <!-- 主 CPR 指標橫幅 -->
        <div class="cpr-primary-metric-banner">
          <div class="cpr-value-box">
            <span class="cpr-label">腦胎盤比值 (Cerebroplacental Ratio, CPR)</span>
            <span class="cpr-number">${cprDisplay}</span>
            <span class="cpr-formula-sub">計算公式：MCA PI (${mcaEval.measuredValue}) / UA PI (${uaEval.measuredValue})</span>
          </div>

          <div class="cpr-centile-box">
            <span class="centile-label">CPR 百分位數</span>
            <span class="centile-value">${cprCentileDisplay}</span>
            ${renderStatusBadge(cprEval.status, cprEval.statusText)}
          </div>
        </div>

        <!-- 三欄指標網格 -->
        <div class="measurements-grid">
          <!-- MCA PI Tile -->
          <div class="measurement-tile status-${mcaEval.status}">
            <div class="tile-header">
              <span class="tile-title">大腦中動脈 PI</span>
              <span class="tile-abbr">MCA PI</span>
            </div>
            <div class="tile-value-row">
              <span class="measured-label">實測數值:</span>
              <span class="measured-val">${mcaEval.measuredValue.toFixed(2)}</span>
            </div>
            <div class="tile-centile-row">
              <span class="centile-label">百分位數:</span>
              <span class="centile-val">${mcaCentileDisplay}</span>
            </div>
            <div class="tile-badge-row">
              ${renderStatusBadge(mcaEval.status, mcaEval.statusText)}
            </div>
            <div class="tile-provenance">
              ${mcaEval.isVerified ? '✓ 驗證模型' : '<span class="audit-note">模型：三次對數擬合 (待 Table S1)</span>'}
            </div>
          </div>

          <!-- UA PI Tile -->
          <div class="measurement-tile status-${uaEval.status}">
            <div class="tile-header">
              <span class="tile-title">臍動脈 PI</span>
              <span class="tile-abbr">UA PI</span>
            </div>
            <div class="tile-value-row">
              <span class="measured-label">實測數值:</span>
              <span class="measured-val">${uaEval.measuredValue.toFixed(2)}</span>
            </div>
            <div class="tile-centile-row">
              <span class="centile-label">百分位數:</span>
              <span class="centile-val">${uaCentileDisplay}</span>
            </div>
            <div class="tile-stats-row text-xs text-muted">
              <span>預期中位數: <strong>${uaExpectedMedian}</strong></span>
              <span>Z-score: <strong>${uaZScore}</strong></span>
            </div>
            <div class="tile-badge-row">
              ${renderStatusBadge(uaEval.status, uaEval.statusText)}
            </div>
            <div class="tile-provenance">
              <span class="audit-verified">✓ FMF 2019 Table S1 驗證</span>
            </div>
          </div>

          <!-- 懷孕週數 Tile -->
          <div class="measurement-tile status-normal">
            <div class="tile-header">
              <span class="tile-title">懷孕週數</span>
              <span class="tile-abbr">GA</span>
            </div>
            <div class="tile-value-row">
              <span class="measured-label">十進制週數:</span>
              <span class="measured-val">${gaDecimalWeeks.toFixed(2)} 週</span>
            </div>
            <div class="tile-centile-row">
              <span class="centile-label">妊娠總天數:</span>
              <span class="centile-val">${Math.round(gaDecimalWeeks * 7)} 天</span>
            </div>
            <div class="tile-stats-row text-xs text-muted">
              <span>標準: <strong>FMF 2019</strong></span>
              <span>範圍: 20+0 至 41+6 週</span>
            </div>
            <div class="tile-badge-row">
              <span class="status-badge badge-normal"><span class="badge-icon">✓</span> 參考標準運行中</span>
            </div>
          </div>
        </div>
      `;
    }
  };
}
