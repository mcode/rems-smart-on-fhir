import { MedicationRequest } from 'fhir/r4';
import { SupportedHooks } from '../cds-hooks/resources/HookTypes';
import { getDrugCodeableConceptFromMedicationRequest } from '../views/Questionnaire/questionnaireUtil';
import { medicationRequestToRemsAdmins } from './data';

export const getMedicationSpecificRemsAdminUrl = (
  request: MedicationRequest | undefined,
  hook: SupportedHooks
) => {
  // if empty request, just return
  if (request && Object.keys(request).length === 0) {
    return null;
  }

  const codeableConcept = getDrugCodeableConceptFromMedicationRequest(request);
  const display = codeableConcept?.coding?.[0]?.display;
  const rxnorm = codeableConcept?.coding?.[0]?.code;

  if (!rxnorm) {
    console.log("ERROR: unknown MedicationRequest code: '", rxnorm);
    return null;
  }

  // This function never gets called with the PATIENT_VIEW hook, however.
  if (
    !(
      hook === SupportedHooks.PATIENT_VIEW ||
      hook === SupportedHooks.ORDER_SIGN ||
      hook === SupportedHooks.ORDER_SELECT ||
      hook === SupportedHooks.ENCOUNTER_START
    )
  ) {
    console.log(`ERROR: unknown hook type: ${hook}`);
    return null;
  }

  const setting = medicationRequestToRemsAdmins.find(
    value => Number(value.rxnorm) === Number(rxnorm)
  );

  const cdsUrl = setting?.hookEndpoints.find(endpoint => endpoint.hook === hook);

  if (!cdsUrl) {
    console.log(`Medication ${display} is not a REMS medication`);
    return null;
  }

  return cdsUrl.remsAdmin;
};
