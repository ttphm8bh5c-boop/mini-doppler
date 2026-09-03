/**
 * 多普勒血流搏動指數輸入組件 (Doppler PI Input Component)
 */

export function renderDopplerInput(container, onCalculate, onClear) {
  container.innerHTML = `
    <div class="doppler-inputs-grid">
      <!-- MCA PI -->
      <div class="form-group">
        <div class="label-row">
          <label for="mca-pi" class="form-label font-semibold">大腦中動脈搏動指數</label>
          <span class="sub-label">MCA PI</span>
        </div>
        <div class="input-with-icon">
          <input
            type="number"
            id="mca-pi"
            name="mca-pi"
            class="form-control"
            min="0.1"
            max="4.0"
            step="0.01"
            placeholder="例如 1.28"
            value="1.28"
            aria-describedby="mca-feedback"
            required
          />
          <span class="input-tag">PI</span>
        </div>
        <div id="mca-feedback" class="feedback-message" role="alert" aria-live="polite"></div>
      </div>

      <!-- UA PI -->
      <div class="form-group">
        <div class="label-row">
          <label for="ua-pi" class="form-label font-semibold">臍動脈搏動指數</label>
          <span class="sub-label">UA PI / UmA PI</span>
        </div>
        <div class="input-with-icon">
          <input
            type="number"
            id="ua-pi"
            name="ua-pi"
            class="form-control"
            min="0.1"
            max="4.0"
            step="0.01"
            placeholder="例如 1.02"
            value="1.02"
            aria-describedby="ua-feedback"
            required
          />
          <span class="input-tag">PI</span>
        </div>
        <div id="ua-feedback" class="feedback-message" role="alert" aria-live="polite"></div>
      </div>
    </div>

    <div class="action-buttons-row">
      <button type="button" id="btn-calculate" class="btn btn-primary btn-lg">
        <span class="btn-icon">⚡</span> 計算與臨床判讀 (Calculate)
      </button>
      <button type="button" id="btn-clear" class="btn btn-outline">
        重設 (Reset)
      </button>
    </div>
  `;

  const mcaInput = container.querySelector('#mca-pi');
  const uaInput = container.querySelector('#ua-pi');
  const mcaFeedback = container.querySelector('#mca-feedback');
  const uaFeedback = container.querySelector('#ua-feedback');
  const calcBtn = container.querySelector('#btn-calculate');
  const clearBtn = container.querySelector('#btn-clear');

  const triggerCalculate = () => {
    if (onCalculate) {
      onCalculate({
        mcaPI: mcaInput.value,
        uaPI: uaInput.value
      });
    }
  };

  calcBtn.addEventListener('click', triggerCalculate);

  mcaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      uaInput.focus();
    }
  });

  uaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerCalculate();
    }
  });

  clearBtn.addEventListener('click', () => {
    mcaInput.value = '';
    uaInput.value = '';
    mcaFeedback.textContent = '';
    uaFeedback.textContent = '';
    mcaFeedback.className = 'feedback-message hidden';
    uaFeedback.className = 'feedback-message hidden';
    if (onClear) onClear();
    mcaInput.focus();
  });

  return {
    getValues: () => ({
      mcaPI: mcaInput.value,
      uaPI: uaInput.value
    }),
    setValues: (mca, ua) => {
      mcaInput.value = mca;
      uaInput.value = ua;
    },
    setErrors: (errors = {}) => {
      if (errors.mcaPI) {
        mcaFeedback.className = 'feedback-message feedback-error';
        mcaFeedback.textContent = errors.mcaPI;
      } else {
        mcaFeedback.className = 'feedback-message hidden';
        mcaFeedback.textContent = '';
      }

      if (errors.uaPI) {
        uaFeedback.className = 'feedback-message feedback-error';
        uaFeedback.textContent = errors.uaPI;
      } else {
        uaFeedback.className = 'feedback-message hidden';
        uaFeedback.textContent = '';
      }
    }
  };
}
