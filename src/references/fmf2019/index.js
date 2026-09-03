/**
 * FMF 2019 Complete Reference Dataset implementation
 */

import { FMF_2019_METADATA } from './metadata.js';
import { getUAReference, UA_COEFFICIENTS } from './ua.js';
import { getMCAReference, MCA_COEFFICIENTS } from './mca.js';
import { getCPRReference, CPR_COEFFICIENTS } from './cpr.js';

/**
 * @type {import('../types.js').DopplerReferenceModel}
 */
export const fmf2019ReferenceModel = {
  id: FMF_2019_METADATA.id,
  name: FMF_2019_METADATA.name,
  source: `${FMF_2019_METADATA.authors}. ${FMF_2019_METADATA.title}. ${FMF_2019_METADATA.journal} ${FMF_2019_METADATA.year}; ${FMF_2019_METADATA.volume}:${FMF_2019_METADATA.pages}.`,
  doi: FMF_2019_METADATA.doi,
  gestationalAgeRange: FMF_2019_METADATA.gestationalAgeRange,
  getUAReference,
  getMCAReference,
  getCPRReference,
  coefficients: {
    ua: UA_COEFFICIENTS,
    mca: MCA_COEFFICIENTS,
    cpr: CPR_COEFFICIENTS
  }
};
