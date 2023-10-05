import { BundleEntry, MedicationRequest } from 'fhir/r4';

//! Will be removed !
const tempIpledge: BundleEntry<MedicationRequest> = {
    "resource": {
        "resourceType": "MedicationRequest",
        "id": "pat017-mr-IPledge",
        "medicationCodeableConcept": {
            "coding": [
                {
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": "6064",
                    "display": "Isotretinoin 200 MG Oral Capsule"
                }
            ]
        },
        "status": "active",
        "intent": "order",
        "subject": {
            "reference": "Patient/pat017",
            "display": "Jon Snow"
        },
        "authoredOn": "2020-07-11",
        "requester": {
            "reference": "Practitioner/pra-sstrange",
            "display": "Jane Doe"
        },
        "reasonCode": [
            {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "52042003",
                        "display": "Systemic lupus erythematosus glomerulonephritis syndrome, World Health Organization class V (disorder)"
                    }
                ]
            }
        ],
        "insurance": [
            {
                "reference": "Coverage/cov017"
            }
        ],
        "dosageInstruction": [
            {
                "sequence": 1,
                "text": "200mg twice daily",
                "timing": {
                    "repeat": {
                        "frequency": 2,
                        "period": 1,
                        "periodUnit": "d"
                    }
                },
                "route": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "26643006",
                            "display": "Oral route (qualifier value)"
                        }
                    ]
                },
                "doseAndRate": [
                    {
                        "type": {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                                    "code": "ordered",
                                    "display": "Ordered"
                                }
                            ]
                        },
                        "doseQuantity": {
                            "value": 200,
                            "unit": "mg",
                            "system": "http://unitsofmeasure.org",
                            "code": "mg"
                        }
                    }
                ]
            }
        ],
        "dispenseRequest": {
            "quantity": {
                "value": 90,
                "system": "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
                "code": "CAP"
            },
            "numberOfRepeatsAllowed": 3
        }
    }
};

export default tempIpledge;