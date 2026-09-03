/**
 * Pure CPR Reference Curve Chart
 */

import { fmf2019ReferenceModel } from '../references/fmf2019/index.js';

export function generateCPRReferenceCurveData() {
  const points = [];
  for (let ga = 20.0; ga <= 41.85; ga += 0.5) {
    const ref = fmf2019ReferenceModel.getCPRReference(ga);
    points.push({
      ga,
      p5: ref.centile5,
      p50: ref.centile50,
      p95: ref.centile95
    });
  }
  return points;
}

export function renderCPRChart(container, options = {}) {
  const {
    patientGA = null,
    patientCPR = null,
    patientPercentile = null
  } = options;

  const data = generateCPRReferenceCurveData();

  const width = 600;
  const height = 400;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minX = 20;
  const maxX = 42;

  let minY = 0.4;
  let maxY = 3.0;

  if (patientCPR !== null && patientCPR > maxY) {
    maxY = Math.ceil(patientCPR * 1.12 * 10) / 10;
  }

  const scaleX = (x) => padding.left + ((x - minX) / (maxX - minX)) * plotW;
  const scaleY = (y) => padding.top + plotH - ((y - minY) / (maxY - minY)) * plotH;

  const path50 = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.ga).toFixed(1)} ${scaleY(d.p50).toFixed(1)}`).join(' ');
  const path95 = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.ga).toFixed(1)} ${scaleY(d.p95).toFixed(1)}`).join(' ');
  const path5 = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.ga).toFixed(1)} ${scaleY(d.p5).toFixed(1)}`).join(' ');

  const forward95 = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.ga).toFixed(1)} ${scaleY(d.p95).toFixed(1)}`).join(' ');
  const backward5 = [...data].reverse().map((d) => `L ${scaleX(d.ga).toFixed(1)} ${scaleY(d.p5).toFixed(1)}`).join(' ');
  const shadedBand = `${forward95} ${backward5} Z`;

  let gridX = '';
  for (let w = 20; w <= 42; w += 2) {
    const x = scaleX(w);
    gridX += `
      <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotH}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
      <text x="${x}" y="${padding.top + plotH + 16}" font-size="11" fill="#64748b" text-anchor="middle">${w}w</text>
    `;
  }

  let gridY = '';
  for (let yVal = 0.5; yVal <= maxY + 0.001; yVal += 0.5) {
    const y = scaleY(yVal);
    gridY += `
      <line x1="${padding.left}" y1="${y}" x2="${padding.left + plotW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
      <text x="${padding.left - 8}" y="${y + 4}" font-size="11" fill="#64748b" text-anchor="end">${yVal.toFixed(1)}</text>
    `;
  }

  let patientMarker = '';
  if (patientGA !== null && patientCPR !== null && patientGA >= minX && patientGA <= maxX) {
    const px = scaleX(patientGA);
    const py = scaleY(patientCPR);
    const isAbnormal = patientPercentile !== null && patientPercentile < 5.0;
    const markerColor = isAbnormal ? '#dc2626' : '#16a34a';

    patientMarker = `
      <line x1="${px}" y1="${padding.top}" x2="${px}" y2="${padding.top + plotH}" stroke="${markerColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
      <line x1="${padding.left}" y1="${py}" x2="${padding.left + plotW}" y2="${py}" stroke="${markerColor}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
      <circle cx="${px}" cy="${py}" r="9" fill="${markerColor}" opacity="0.25"/>
      <circle cx="${px}" cy="${py}" r="5.5" fill="${markerColor}" stroke="#ffffff" stroke-width="2"/>
      <g transform="translate(${px > plotW / 2 + padding.left ? px - 95 : px + 10}, ${py < 50 ? py + 16 : py - 16})">
        <rect width="88" height="24" rx="4" fill="#0f172a" opacity="0.9"/>
        <text x="44" y="16" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">
          CPR ${patientCPR.toFixed(2)}
        </text>
      </g>
    `;
  }

  container.innerHTML = `
    <div class="cpr-svg-container">
      <svg viewBox="0 0 ${width} ${height}" class="cpr-svg" preserveAspectRatio="xMidYMid meet">
        <rect x="${padding.left}" y="${padding.top}" width="${plotW}" height="${plotH}" fill="#f8fafc" rx="4"/>
        ${gridX}
        ${gridY}

        <path d="${shadedBand}" fill="#e0f2fe" opacity="0.75"/>
        <path d="${path95}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>
        <path d="${path50}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
        <path d="${path5}" fill="none" stroke="#dc2626" stroke-width="2"/>

        ${patientMarker}

        <text x="${padding.left + plotW / 2}" y="${height - 6}" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
          週數 (GA)
        </text>
        <text transform="rotate(-90)" x="${-(padding.top + plotH / 2)}" y="14" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">
          CPR
        </text>
      </svg>

      <div class="chart-legend-row">
        <span class="legend-chip"><span class="swatch-50"></span> 50th</span>
        <span class="legend-chip"><span class="swatch-5"></span> 5th (< 5th 異常)</span>
        <span class="legend-chip"><span class="swatch-band"></span> 5th–95th 區間</span>
        ${patientCPR !== null ? '<span class="legend-chip"><span class="swatch-pt"></span> 實測點</span>' : ''}
      </div>
    </div>
  `;
}
