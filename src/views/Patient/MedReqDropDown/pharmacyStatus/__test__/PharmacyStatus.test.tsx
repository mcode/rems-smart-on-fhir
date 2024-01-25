import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Patient, MedicationRequest } from 'fhir/r4';
import nock from 'nock';

import PharmacyStatus from '../PharmacyStatus';
import DoctorOrder from '../DoctorOrder';
import MetRequirements from '../../etasuStatus/MetRequirements';

const pharmacy_server_base = 'http://localhost:5051';

const testPatient: Patient = {
  resourceType: 'Patient',
  id: 'pat017',
  gender: 'male',
  birthDate: '1996-06-01',
  name: [
    {
      use: 'official',
      family: 'Snow',
      given: ['Jon', 'Stark']
    }
  ]
};

const testMedicationRequest: MedicationRequest = {
  resourceType: 'MedicationRequest',
  id: 'pat017-mr-IPledge',
  medicationCodeableConcept: {
    coding: [
      {
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: '6064',
        display: 'Isotretinoin 20 MG Oral Capsule'
      },
      {
        system: 'http://hl7.org/fhir/sid/ndc',
        code: '0245-0571-01'
      }
    ]
  },
  status: 'active',
  intent: 'order',
  subject: {
    reference: 'Patient/pat017',
    display: 'Jon Snow'
  },
  authoredOn: '2020-07-11'
};

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
    metRequirements: [patientEnrollmentForm, prescriberEnrollmentForm, pharmacistEnrollmentForm]
  };
  return doctorOrder;
};
describe('Test the PharmacyStatus Component', () => {
  function expectContains(value: string) {
    const element = screen.getByText(value);
    expect(element).toBeInTheDocument();
  }

  test('Contains all elements', () => {
    const update = false;

    // render the module
    render(<PharmacyStatus update={update} callback={() => {}} pimsResponse={null} />);

    // test the status fields and headings are present
    expectContains('Pharmacy Status');
    expectContains('ID: N/A');
    expectContains('Status: N/A');

    // check the refresh button is present
    const refreshButton = screen.getByTestId('refresh');
    expect(refreshButton).toBeInTheDocument();
  });
  test('Renders order', async () => {
    const doctorOrder = generateDoctorOrder();
    render(<PharmacyStatus update={false} callback={() => {}} pimsResponse={doctorOrder} />);

    expect(await screen.findByText(`ID: ${doctorOrder._id}`)).toBeInTheDocument();
    expect(await screen.findByText(`Status: ${doctorOrder.dispenseStatus}`)).toBeInTheDocument();
  });

  test('Loads data on start', () => {
    const update = true;
    let pimsResponse = false;
    const callback = () => {
      pimsResponse = true;
    };
    // render the module
    render(<PharmacyStatus update={update} callback={callback} pimsResponse={null} />);
    // verify that the values are updated from the call to get the Pharmacy Status
    expect(pimsResponse).toBeTruthy();
  });

  test('Update retrieves data', () => {
    const update = false;
    let called = false;
    const callback = () => {
      called = true;
    };
    // render the module
    render(<PharmacyStatus update={update} callback={callback} pimsResponse={null} />);

    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    // verify that the values are updated from the call to get the Pharmacy Status
    expect(called).toBe(true);
  });

  test('Failed to load status', async () => {
    const update = true;
    // render the module
    render(<PharmacyStatus update={update} callback={() => {}} pimsResponse={null} />);

    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    // verify that the values are updated from the call to get the Pharmacy Status
    expect(await screen.findByText('ID: N/A')).toBeInTheDocument();
    expect(await screen.findByText('Status: N/A')).toBeInTheDocument();
  });
});
