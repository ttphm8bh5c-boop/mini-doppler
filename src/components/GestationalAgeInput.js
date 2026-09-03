/**
 * 懷孕週數輸入組件 (Gestational Age Input Component)
 */

export function renderGestationalAgeInput(container, onChange) {
  container.innerHTML = `
    <div class="form-group ga-form-group">
      <label class="form-label font-semibold">
        懷孕週數 (Gestational Age)
        <span class="tooltip-icon" title="FMF 驗證參考範圍：20+0 至 41+6 週">ℹ️</span>
      </label>

      <div class="ga-input-row">
        <div class="ga-field">
          <input
            type="number"
            id="ga-weeks"
            name="ga-weeks"
            class="form-control"
            min="10"
            max="45"
            step="1"
            placeholder="35"
            value="35"
            aria-label="懷孕週數 (weeks)"
            required
          />
          <span class="ga-unit">週 (weeks)</span>
        </div>

        <span class="ga-plus">+</span>

        <div class="ga-field">
          <input
            type="number"
            id="ga-days"
            name="ga-days"
            class="form-control"
            min="0"
            max="6"
            step="1"
            placeholder="4"
            value="4"
            aria-label="天數 (days)"
            required
          />
          <span class="ga-unit">天 (days)</span>
        </div>

        <div class="ga-decimal-badge">
          <span class="badge-label">十進制週數:</span>
          <span id="ga-decimal-display" class="badge-value">35.57 週</span>
        </div>
      </div>

      <div class="ga-presets">
        <span class="preset-label">快速預設週數:</span>
        <button type="button" class="preset-chip" data-weeks="24" data-days="0">24+0</button>
        <button type="button" class="preset-chip" data-weeks="28" data-days="0">28+0</button>
        <button type="button" class="preset-chip" data-weeks="32" data-days="0">32+0</button>
        <button type="button" class="preset-chip active" data-weeks="35" data-days="4">35+4</button>
        <button type="button" class="preset-chip" data-weeks="37" data-days="0">37+0</button>
        <button type="button" class="preset-chip" data-weeks="40" data-days="0">40+0</button>
      </div>

      <div id="ga-feedback" class="feedback-message" role="alert" aria-live="polite"></div>
    </div>
  `;

  const weeksInput = container.querySelector('#ga-weeks');
  const daysInput = container.querySelector('#ga-days');
  const decimalDisplay = container.querySelector('#ga-decimal-display');
  const feedback = container.querySelector('#ga-feedback');
  const presetChips = container.querySelectorAll('.preset-chip');

  function update() {
    const w = weeksInput.value;
    const d = daysInput.value;

    presetChips.forEach(chip => {
      const match = chip.dataset.weeks === w && chip.dataset.days === d;
      chip.classList.toggle('active', match);
    });

    if (onChange) {
      onChange({ weeks: w, days: d });
    }
  }

  weeksInput.addEventListener('input', update);
  daysInput.addEventListener('input', update);

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      weeksInput.value = chip.dataset.weeks;
      daysInput.value = chip.dataset.days;
      update();
    });
  });

  return {
    setDecimal: (dec) => {
      decimalDisplay.textContent = Number.isFinite(dec) ? `${dec.toFixed(2)} 週` : '—';
    },
    setFeedback: ({ error, warning }) => {
      if (error) {
        feedback.className = 'feedback-message feedback-error';
        feedback.textContent = error;
      } else if (warning) {
        feedback.className = 'feedback-message feedback-warning';
        feedback.textContent = warning;
      } else {
        feedback.className = 'feedback-message hidden';
        feedback.textContent = '';
      }
    },
    getValues: () => ({
      weeks: weeksInput.value,
      days: daysInput.value
    }),
    setValues: (weeks, days) => {
      weeksInput.value = weeks;
      daysInput.value = days;
      update();
    }
  };
}
