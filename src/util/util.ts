import { MedicationRequest } from 'fhir/r4';
import { SupportedHooks } from '../cds-hooks/resources/HookTypes';
import { getDrugCodeableConceptFromMedicationRequest } from '../views/Questionnaire/questionnaireUtil';
import { medicationRequestToRemsAdmins } from './data';
import * as env from 'env-var';

const getMedicationSpecificRemsAdminUrl = (
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

const getIntermediaryCdsUrl = (hook: SupportedHooks): string => {
  const intermediaryBaseUrl = env.get('INTERMEDIARY_SERVER_BASE').asString();
  if (!intermediaryBaseUrl) {
    throw new Error(
      'Forwarding CDS hook to REMS intermediary, but INTERMEDIARY_SERVER_BASE is not defined'
    );
  }
  return `${intermediaryBaseUrl}/r4/cds-services/${hook}-crd`;
};

export const getCdsUrlsForPatientViewHook = (): string[] => {
  return env.get('USE_INTERMEDIARY').asBool()
    ? [getIntermediaryCdsUrl(SupportedHooks.PATIENT_VIEW)]
    : (Array.from(
        new Set(
          medicationRequestToRemsAdmins.map(
            ({ hookEndpoints }) =>
              hookEndpoints.find(({ hook }) => hook === SupportedHooks.PATIENT_VIEW)?.remsAdmin
          )
        )
      ).filter(url => !!url) as string[]);
};

export const getCdsUrl = (
  request: MedicationRequest | undefined,
  hook: SupportedHooks
): string | null => {
  return env.get('USE_INTERMEDIARY').asBool()
    ? getIntermediaryCdsUrl(hook)
    : getMedicationSpecificRemsAdminUrl(request, hook);
};

export const getEtasuUrl = () => {
  const useIntermediary = env.get('USE_INTERMEDIARY').asBool();
  const intermediaryBaseUrl = env.get('INTERMEDIARY_SERVER_BASE').asString();
  const nonIntermediaryBaseUrl = env.get('REACT_APP_REMS_ADMIN_SERVER_BASE').asString();
  return `${
    useIntermediary ? intermediaryBaseUrl : nonIntermediaryBaseUrl
  }/4_0_0/GuidanceResponse/$rems-etasu`;
};
