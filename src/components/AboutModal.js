/**
 * 臨床方法學與文獻溯源對話框組件 (About & Clinical Methodology Modal)
 */

export function renderAboutModal(container) {
  container.innerHTML = `
    <div id="about-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h2 id="about-modal-title" class="modal-title">臨床方法學與數據溯源 (Methodology & Provenance)</h2>
            <p class="modal-subtitle">產科多普勒血流與腦胎盤比值（CPR）臨床判讀指引</p>
          </div>
          <button id="close-modal-btn" class="modal-close-btn" aria-label="關閉對話框">&times;</button>
        </div>

        <div class="modal-body">
          <section class="modal-section callout-disclaimer">
            <h3>⚠️ 預期用途與臨床防護原則</h3>
            <p>
              本應用程式專為合格產科臨床專業人員設計，旨在作為計算與判讀胎兒<strong>腦胎盤比值（Cerebroplacental Ratio, CPR）</strong>的輔助工具。
            </p>
            <p class="disclaimer-emphasis">
              <strong>本系統絕不提供治療建議、分娩建議，亦不可取代產科醫師之專業臨床判斷。</strong>
              所有臨床決策必須綜合產婦病史、胎兒生長測量、羊水量、胎兒生物物理評分（BPP）及醫療院所標準流程進行整體評估。
            </p>
          </section>

          <section class="modal-section">
            <h3>1. 核心計算公式</h3>
            <div class="formula-box">
              $$\\text{CPR} = \\frac{\\text{MCA PI}}{\\text{UA PI}}$$
            </div>
            <p>
              其中 <strong>MCA PI</strong> 代表大腦中動脈搏動指數，<strong>UA PI</strong> 代表臍動脈搏動指數。
              介面上 CPR 顯示至<strong>小數點後 2 位</strong>，系統內部所有數學運算均保留 64 位元完整浮點精度。
            </p>
            <p>
              懷孕週數轉換為十進制：
              <code>GA_decimal = 週數 + (天數 / 7)</code>（例如：35 週 4 天 = 35.5714 週）。
            </p>
          </section>

          <section class="modal-section">
            <h3>2. 主要參考標準：英國胎兒醫學基金會 (FMF 2019)</h3>
            <p><strong>文獻出處：</strong></p>
            <div class="citation-card">
              <p class="citation-authors">Ciobanu A, Wright A, Syngelaki A, Wright D, Akolekar R, Nicolaides KH.</p>
              <p class="citation-title">"Fetal Medicine Foundation reference ranges for umbilical artery and middle cerebral artery pulsatility index and cerebroplacental ratio."</p>
              <p class="citation-journal"><em>Ultrasound in Obstetrics & Gynecology</em>. 2019;53:465–472.</p>
              <p class="citation-doi">DOI: <a href="https://doi.org/10.1002/uog.20157" target="_blank" rel="noopener noreferrer">10.1002/uog.20157</a></p>
              <p class="citation-cohort">研究對象：72,387 名於 20+0 至 41+6 週接受產前常規超音波檢查之單胞胎孕婦。</p>
            </div>

            <h4 class="mt-3 font-semibold">數學模型與驗證狀態 (Audit Status)</h4>
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>血管／指數</th>
                  <th>擬合函數型態</th>
                  <th>驗證公式與係數</th>
                  <th>稽核狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>臍動脈 (UA-PI)</strong></td>
                  <td>線性中位數；對數二次方標準差</td>
                  <td>
                    <code>中位數 = 1.6473 - 0.003005 × GA(天)</code><br>
                    <code>SD(log10) = 0.08713 - 0.0002936 × GA + 0.0000009355 × GA²</code>
                  </td>
                  <td><span class="badge-tag tag-verified">✓ 已完整驗證 (Table S1)</span></td>
                </tr>
                <tr>
                  <td><strong>大腦中動脈 (MCA-PI)</strong></td>
                  <td>三次多項式中位數；二次方標準差 (log10)</td>
                  <td><code>log10(中位數) = β₀ + β₁·GA + β₂·GA² + β₃·GA³</code></td>
                  <td><span class="badge-tag tag-awaiting">等待 Table S1 論文付費庫核對</span></td>
                </tr>
                <tr>
                  <td><strong>腦胎盤比值 (CPR)</strong></td>
                  <td>三次多項式中位數；二次方標準差 (log10)</td>
                  <td><code>log10(中位數) = α₀ + α₁·GA + α₂·GA² + α₃·GA³</code></td>
                  <td><span class="badge-tag tag-awaiting">等待 Table S1 論文付費庫核對</span></td>
                </tr>
              </tbody>
            </table>
            <p class="text-sm text-muted mt-2">
              <em>臨床透明性原則：</em> 本系統嚴格遵守臨床誠信原則，絕不捏造或粗略估算係數。UA-PI 係數已經由原始文獻與二級文獻（DeVore 2021）雙重驗證；
              MCA 與 CPR 之三次多項式架構已完整建立於專屬模組中，清晰標示為待驗證狀態，並支援切換代表性模型或手動配置係數。
            </p>
          </section>

          <section class="modal-section">
            <h3>3. 臨床判讀原則與 ISUOG Delphi 共識</h3>
            <p>
              本系統採用<strong>國際婦產科超音波學會（ISUOG）</strong>與國際 Delphi 共識之標準臨床術語：
            </p>
            <ul>
              <li><strong>腦胎盤比值 (CPR) &lt; 第 5 百分位數：</strong> 定義為腦血流重新分佈／腦保護模式（cerebral blood-flow redistribution / brain-sparing pattern）。</li>
              <li><strong>大腦中動脈 (MCA PI) &lt; 第 5 百分位數：</strong> 符合腦血管擴張（cerebral vasodilatation）。</li>
              <li><strong>臍動脈 (UA PI) &gt; 第 95 百分位數：</strong> 提示胎盤血管阻力增加（increased placental vascular resistance）。</li>
            </ul>

            <h4 class="mt-3 font-semibold">重要臨床設計原則：懷孕週數百分位數 vs 歷史固定門檻 (CPR &lt; 1.0)</h4>
            <p>
              早期文獻常使用固定的 <code>CPR &lt; 1.0</code> 作為分界線。然而，現行 ISUOG 與現代產科學指引明確強調：<strong>必須以特定懷孕週數百分位數為主要標準</strong>：
            </p>
            <ul>
              <li>在懷孕中期至晚期偏早階段（如 24–32 週），正常胎兒的 CPR 顯著高於 1.0；此時即便 CPR 為 1.10，亦可能已低於該週數的第 5 百分位數，顯示已有腦保護現象。</li>
              <li>接近足月（38–41 週），胎兒 CPR 本身就會生理性自然下降至 1.2–1.3 左右。</li>
              <li>固定門檻 1.0 缺乏懷孕週數特異性，易導致晚期生長受限漏診。因此介面雖提供歷史數值參考，但判讀一律以週數百分位數為準。</li>
            </ul>
          </section>

          <section class="modal-section">
            <h3>4. 適用懷孕週數區間</h3>
            <p>
              FMF 參考模型之驗證區間為 <strong>20+0 至 41+6 週</strong>（140 至 293 天）。輸入超出此範圍之數據時，系統將顯示警示訊息。
            </p>
          </section>
        </div>

        <div class="modal-footer">
          <button id="modal-close-action-btn" class="btn btn-primary">我已充分瞭解並關閉 (Close)</button>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('about-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const closeActionBtn = document.getElementById('modal-close-action-btn');

  const hideModal = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  closeBtn?.addEventListener('click', hideModal);
  closeActionBtn?.addEventListener('click', hideModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });

  return {
    show: () => {
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    },
    hide: hideModal
  };
}
