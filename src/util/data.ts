import { SupportedHooks } from '../cds-hooks/resources/HookTypes';

export const medicationRequestToRemsAdmins = Object.freeze([
  {
    rxnorm: 2183126,
    display: 'Turalio 200 MG Oral Capsule',
    hookEndpoints: [
      {
        hook: SupportedHooks.ORDER_SIGN,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-sign'
      },
      {
        hook: SupportedHooks.ORDER_SELECT,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-select'
      },
      {
        hook: SupportedHooks.PATIENT_VIEW,
        remsAdmin: 'http://localhost:8090/cds-services/rems-patient-view'
      },
      {
        hook: SupportedHooks.ENCOUNTER_START,
        remsAdmin: 'http://localhost:8090/cds-services/rems-encounter-start'
      }
    ]
  },
  {
    rxnorm: 6064,
    display: 'Isotretinoin 20 MG Oral Capsule',
    hookEndpoints: [
      {
        hook: SupportedHooks.ORDER_SIGN,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-sign'
      },
      {
        hook: SupportedHooks.ORDER_SELECT,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-select'
      },
      {
        hook: SupportedHooks.PATIENT_VIEW,
        remsAdmin: 'http://localhost:8090/cds-services/rems-patient-view'
      },
      {
        hook: SupportedHooks.ENCOUNTER_START,
        remsAdmin: 'http://localhost:8090/cds-services/rems-encounter-start'
      }
    ]
  },
  {
    rxnorm: 1237051,
    display: 'TIRF 200 UG Oral Transmucosal Lozenge',
    hookEndpoints: [
      {
        hook: SupportedHooks.ORDER_SIGN,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-sign'
      },
      {
        hook: SupportedHooks.ORDER_SELECT,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-select'
      },
      {
        hook: SupportedHooks.PATIENT_VIEW,
        remsAdmin: 'http://localhost:8090/cds-services/rems-patient-view'
      },
      {
        hook: SupportedHooks.ENCOUNTER_START,
        remsAdmin: 'http://localhost:8090/cds-services/rems-encounter-start'
      }
    ]
  },
  {
    rxnorm: 1666386,
    display: 'Addyi 100 MG Oral Tablet',
    hookEndpoints: [
      {
        hook: SupportedHooks.ORDER_SIGN,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-sign'
      },
      {
        hook: SupportedHooks.ORDER_SELECT,
        remsAdmin: 'http://localhost:8090/cds-services/rems-order-select'
      },
      {
        hook: SupportedHooks.PATIENT_VIEW,
        remsAdmin: 'http://localhost:8090/cds-services/rems-patient-view'
      },
      {
        hook: SupportedHooks.ENCOUNTER_START,
        remsAdmin: 'http://localhost:8090/cds-services/rems-encounter-start'
      }
    ]
  }
]);
