/**
 * Reference model registry and resolver
 */

import { fmf2019ReferenceModel } from './fmf2019/index.js';

/**
 * Registry of available Doppler reference datasets.
 * Designed for future pluggability (INTERGROWTH-21st, Baschat, etc.).
 */
export const REFERENCE_MODELS = {
  [fmf2019ReferenceModel.id]: fmf2019ReferenceModel
};

export const DEFAULT_REFERENCE_MODEL_ID = fmf2019ReferenceModel.id;

/**
 * Retrieves a reference model by identifier.
 * @param {string} [id]
 * @returns {import('./types.js').DopplerReferenceModel}
 */
export function getReferenceModel(id = DEFAULT_REFERENCE_MODEL_ID) {
  const model = REFERENCE_MODELS[id];
  if (!model) {
    throw new Error(`Reference model '${id}' not found in registry.`);
  }
  return model;
}
