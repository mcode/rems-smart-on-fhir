import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Patient, MedicationRequest } from 'fhir/r4';
import nock from 'nock';

import PharmacyStatus from '../PharmacyStatus';
import DoctorOrder from '../DoctorOrder';
import MetRequirements from '../../etasuStatus/MetRequirements';
import config from '../../../../../config.json';

const testPatient: Patient = {
    'resourceType': 'Patient',
    'id': 'pat017',
    'gender': 'male',
    'birthDate': '1996-06-01',
    'name': [
      {
        'use': 'official',
        'family': 'Snow',
        'given': ['Jon', 'Stark']
      }
    ]
  }

const testMedicationRequest: MedicationRequest = {
    'resourceType': 'MedicationRequest',
    'id': 'pat017-mr-IPledge',
    'medicationCodeableConcept': {
      'coding': [
        {
          'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
          'code': '6064',
          'display': 'Isotretinoin 20 MG Oral Capsule'
        },
        {
          'system': 'http://hl7.org/fhir/sid/ndc',
          'code': '0245-0571-01'
        }
      ]
    },
    'status': 'active',
    'intent': 'order',
    'subject': {
      'reference': 'Patient/pat017',
      'display': 'Jon Snow'
    },
    'authoredOn': '2020-07-11'
  }

const generateDoctorOrder = () => {
    const patientEnrollmentForm: MetRequirements = {
        completed: true,
        metRequirementId: 'asldkf23a',
        requirementDescription: 'Submit Patient Enrollment form to the REMS Administrator',
        requirementName: 'Patient Enrollment Form',
        stakeholderId: 'dlksk2222'
    };
    const prescriberEnrollmentForm: MetRequirements = {
        completed: false,
        metRequirementId: 'asldkf23b',
        requirementDescription: 'Submit Prescriber Enrollment form to the REMS Administrator',
        requirementName: 'Prescriber Enrollment Form',
        stakeholderId: 'dlksk2222'
    };
    const pharmacistEnrollmentForm: MetRequirements = {
        completed: true,
        metRequirementId: 'asldkf23c',
        requirementDescription: 'Submit Pharmacist Enrollment form to the REMS Administrator',
        requirementName: 'Pharmacist Enrollment Form',
        stakeholderId: 'dlksk2222'
    };
    const doctorOrder: DoctorOrder = {
        _id: '1234',
        caseNumber: '2k3js',
        patientName: 'Jon Snow',
        patientFirstName: 'Jon',
        patientLastName: 'Snow',
        patientDOB: '1996-06-01',
        patientCity: 'Winterfell',
        patientStateProvince: 'Westeros',
        patientPostalCode: '00008',
        patientCountry: 'USA',
        doctorName: 'Dr. Jane Doe',
        doctorContact: '555-123-4567',
        doctorID: 'sdk2kd991',
        doctorEmail: 'jane.doe@doctor.com',
        drugNames: 'Medication',
        simpleDrugName: 'Medication',
        rxDate: '2023-03-04',
        drugPrice: 35,
        drugNdcCode: '0245-0571-01',
        quanitities: '20',
        total: 1,
        pickupDate: '2023-04-04',
        dispenseStatus: 'Pending',
        metRequirements: [
            patientEnrollmentForm,
            prescriberEnrollmentForm,
            pharmacistEnrollmentForm
        ]
    };
    return doctorOrder;
};

describe('Test the PharmacyStatus Component', () => {
    function expectContains(value: string) {
        const element = screen.getByText(value);
        expect(element).toBeInTheDocument();
    }

    test('Contains all elements', () => {
        let update: boolean = false;

        // render the module
        render(<PharmacyStatus patient={testPatient} medication={testMedicationRequest} update={update}/>);

        // test the status fields and headings are present
        expectContains('Pharmacy Status');
        expectContains('ID: N/A');
        expectContains('Status: N/A');

        // check the refresh button is present
        const refreshButton = screen.getByTestId('refresh');
        expect(refreshButton).toBeInTheDocument();
    });


    test('Loads data on start', async () => {
        let update: boolean = true;

        const mockRequest = nock(config.pharmacy_server);

        // setup the mocks to handle the axios calls
        const patientFirstName = testPatient.name?.at(0)?.given?.at(0);
        const patientLastName = testPatient?.name?.at(0)?.family;
        const patientDOB = testPatient.birthDate;
        const rxDate = testMedicationRequest.authoredOn;
        const drugNames = testMedicationRequest.medicationCodeableConcept?.coding?.at(0)?.display;
        const ndcDrugCoding = testMedicationRequest.medicationCodeableConcept?.coding?.find(({system}) => system === 'http://hl7.org/fhir/sid/ndc');


        let queryString: string = 'rxDate=' + rxDate + '&drugNames=' + encodeURIComponent(drugNames || '');
        if (ndcDrugCoding != undefined) {
            queryString = queryString + '&drugNdcCode=' + ndcDrugCoding?.code;
        }
        const url = `/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?${queryString}`;
        const doctorOrder = generateDoctorOrder();

        mockRequest
            .defaultReplyHeaders({
                'access-control-allow-origin': '*',
                'access-control-allow-credentials': 'true' 
            })
            .get(url)
            .reply(200, doctorOrder);

        // render the module
        render(<PharmacyStatus patient={testPatient} medication={testMedicationRequest} update={update}/>);
        
        // verify that the values are updated from the call to get the Pharmacy Status
        expect(await screen.findByText('ID: ' + doctorOrder._id)).toBeInTheDocument();
        expect(await screen.findByText('Status: ' + doctorOrder.dispenseStatus)).toBeInTheDocument();
    });

    test('Update retrieves data', async () => {
        let update: boolean = false;

        const mockRequest = nock(config.pharmacy_server);

        // render the module
        render(<PharmacyStatus patient={testPatient} medication={testMedicationRequest} update={update}/>);

        // setup the mocks to handle the axios calls
        const patientFirstName = testPatient.name?.at(0)?.given?.at(0);
        const patientLastName = testPatient?.name?.at(0)?.family;
        const patientDOB = testPatient.birthDate;
        const rxDate = testMedicationRequest.authoredOn;
        const drugNames = testMedicationRequest.medicationCodeableConcept?.coding?.at(0)?.display;
        const ndcDrugCoding = testMedicationRequest.medicationCodeableConcept?.coding?.find(({system}) => system === 'http://hl7.org/fhir/sid/ndc');

        let queryString: string = 'rxDate=' + rxDate + '&drugNames=' + encodeURIComponent(drugNames || '');
        if (ndcDrugCoding != undefined) {
            queryString = queryString + '&drugNdcCode=' + ndcDrugCoding?.code;
        }
        const url = `/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?${queryString}`;
        const doctorOrder = generateDoctorOrder();

        mockRequest
            .defaultReplyHeaders({
                'access-control-allow-origin': '*',
                'access-control-allow-credentials': 'true' 
            })
            .get(url)
            .reply(200, doctorOrder);

        // click the refresh button
        const refreshButton = screen.getByTestId('refresh');
        fireEvent.click(refreshButton);
        
        // verify that the values are updated from the call to get the Pharmacy Status
        expect(await screen.findByText('ID: ' + doctorOrder._id)).toBeInTheDocument();
        expect(await screen.findByText('Status: ' + doctorOrder.dispenseStatus)).toBeInTheDocument();
    });

    test('Failed to load status', async () => {
        let update: boolean = true;

        const mockRequest = nock(config.pharmacy_server);

        // render the module
        render(<PharmacyStatus patient={testPatient} medication={testMedicationRequest} update={update}/>);

        // setup the mocks to handle the axios calls
        const patientFirstName = testPatient.name?.at(0)?.given?.at(0);
        const patientLastName = testPatient?.name?.at(0)?.family;
        const patientDOB = testPatient.birthDate;
        const rxDate = testMedicationRequest.authoredOn;
        const drugNames = testMedicationRequest.medicationCodeableConcept?.coding?.at(0)?.display;
        const ndcDrugCoding = testMedicationRequest.medicationCodeableConcept?.coding?.find(({system}) => system === 'http://hl7.org/fhir/sid/ndc');

        let queryString: string = 'rxDate=' + rxDate + '&drugNames=' + encodeURIComponent(drugNames || '');
        if (ndcDrugCoding != undefined) {
            queryString = queryString + '&drugNdcCode=' + ndcDrugCoding?.code;
        }

        const url = `/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?${queryString}`;

        // return an empty response like if there is no match
        mockRequest
            .defaultReplyHeaders({
                'access-control-allow-origin': '*',
                'access-control-allow-credentials': 'true' 
            })
            .get(url)
            .reply(200, '');


        // click the refresh button
        const refreshButton = screen.getByTestId('refresh');
        fireEvent.click(refreshButton);
        
        // verify that the values are updated from the call to get the Pharmacy Status
        expect(await screen.findByText('ID: N/A')).toBeInTheDocument();
        expect(await screen.findByText('Status: N/A')).toBeInTheDocument();
   });
});