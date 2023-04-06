import { BundleEntry, MedicationRequest } from 'fhir/r4';

//! Will be removed !
const tempTirf: BundleEntry<MedicationRequest> = {
  resource: {
    resourceType: 'MedicationRequest',
    id: 'pat017-mr-TIRF',
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '1237051',
          display: 'TIRF 200 UG Oral Transmucosal Lozenge'
        },
        {
          system: 'http://hl7.org/fhir/sid/ndc',
          code: '63459-502-30'
        }
      ]
    },
    status: 'active',
    intent: 'order',
    subject: {
      reference: 'Patient/pat017',
      display: 'Jon Snow'
    },
    authoredOn: '2020-07-11',
    requester: {
      reference: 'Practitioner/pra1234',
      display: 'Jane Doe'
    },
    reasonCode: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '52042003',
            display:
              'Systemic lupus erythematosus glomerulonephritis syndrome, World Health Organization class V (disorder)'
          }
        ]
      }
    ],
    insurance: [
      {
        reference: 'Coverage/cov017'
      }
    ],
    dosageInstruction: [
      {
        sequence: 1,
        text: '200ug twice daily',
        timing: {
          repeat: {
            frequency: 2,
            period: 1,
            periodUnit: 'd'
          }
        },
        route: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '26643006',
              display: 'Oral route (qualifier value)'
            }
          ]
        },
        doseAndRate: [
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/dose-rate-type',
                  code: 'ordered',
                  display: 'Ordered'
                }
              ]
            },
            doseQuantity: {
              value: 200,
              unit: 'ug',
              system: 'http://unitsofmeasure.org',
              code: 'ug'
            }
          }
        ]
      }
    ],
    dispenseRequest: {
      quantity: {
        value: 90,
        system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
        code: 'ORTROCHE'
      },
      numberOfRepeatsAllowed: 3
    }
  }
};
export default tempTirf;
