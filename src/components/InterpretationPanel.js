/**
 * 臨床多普勒判讀面板組件 (Clinical Interpretation Panel Component)
 * 呈現 ISUOG 標準判讀結論、腦保護型態警示、歷史 CPR 門檻說明與臨床警語
 */

export function renderInterpretationPanel(container) {
  container.innerHTML = `
    <div id="interpretation-box" class="interpretation-panel hidden">
      <!-- 動態載入內容 -->
    </div>
  `;

  const panel = container.querySelector('#interpretation-box');

  return {
    clear: () => {
      panel.className = 'interpretation-panel hidden';
      panel.innerHTML = '';
    },
    update: ({ combined, cprEval, mcaEval, uaEval }) => {
      panel.className = `interpretation-panel active panel-${combined.overallStatus}`;

      let statusTitle = '多普勒血流檢查結果正常';
      let icon = '✓';
      if (combined.overallStatus === 'abnormal') {
        statusTitle = '檢測到異常多普勒血流模式';
        icon = '⚠️';
      } else if (combined.overallStatus === 'borderline') {
        statusTitle = '多普勒血流指標處於臨界區間';
        icon = '⚡';
      }

      const brainSparingPill = combined.isBrainSparing
        ? `<div class="brain-sparing-alert"><span class="alert-icon">🧠</span> <strong>血流動力學模式：</strong>檢測到腦血流重新分佈／腦保護效應（Brain-sparing pattern）</div>`
        : '';

      panel.innerHTML = `
        <div class="interpretation-header">
          <div class="interpretation-status-pill status-pill-${combined.overallStatus}">
            <span class="pill-icon">${icon}</span>
            <span class="pill-text">${statusTitle}</span>
          </div>
          ${brainSparingPill}
        </div>

        <div class="interpretation-headline-box">
          <h3 class="interpretation-headline">${combined.headline}</h3>
          <p class="interpretation-detail">${combined.detail}</p>
        </div>

        <!-- 個別指標 ISUOG 判讀列表 -->
        <div class="parameter-breakdown-list">
          <h4 class="breakdown-title font-semibold">個別指標 ISUOG 準則評估</h4>
          <ul class="breakdown-items">
            <li class="breakdown-item status-${cprEval.status}">
              <span class="item-param">CPR:</span>
              <span class="item-text">${cprEval.statement}</span>
            </li>
            <li class="breakdown-item status-${mcaEval.status}">
              <span class="item-param">MCA PI:</span>
              <span class="item-text">${mcaEval.statement}</span>
            </li>
            <li class="breakdown-item status-${uaEval.status}">
              <span class="item-param">UA PI:</span>
              <span class="item-text">${uaEval.statement}</span>
            </li>
          </ul>
        </div>

        <!-- 歷史 CPR 門檻說明 -->
        <div class="historical-cpr-callout">
          <span class="callout-icon">ℹ️</span>
          <div class="callout-content">
            <p>${combined.historicalCprNote}</p>
          </div>
        </div>

        <!-- 臨床決策防護警語 -->
        <div class="clinical-guardrail-footer">
          <span class="guardrail-lock">🔒</span>
          <p>
            <strong>僅供臨床專業人員輔助參考：</strong> 本工具之綜合分析嚴格依據 ISUOG 國際共識之血流動力學定義。
            本工具<strong>絕不提供</strong>處置、分娩時機或生產方式建議。切勿將此單一計算結果作為臨床介入決策的唯一依據。
          </p>
        </div>
      `;
    }
  };
}
