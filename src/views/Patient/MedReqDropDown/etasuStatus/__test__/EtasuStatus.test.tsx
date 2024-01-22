import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Patient, MedicationRequest } from 'fhir/r4';
import nock from 'nock';

import EtasuStatus from '../EtasuStatus';
import RemsMetEtasuResponse from '../RemsMetEtasuResponse';
import MetRequirements from '../MetRequirements';

const rems_admin_server_base = 'http://localhost:8090';

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
const generateEtasuStatus = () => {
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
  const remsMetEtasuResponse: RemsMetEtasuResponse = {
    case_number: '1234',
    drugCode: 'abcd',
    drugName: 'medication',
    patientFirstname: 'Jon',
    patientLastName: 'Snow',
    patientDOB: '1996-06-01',
    status: 'Pending',
    metRequirements: [patientEnrollmentForm, prescriberEnrollmentForm, pharmacistEnrollmentForm]
  };
  return remsMetEtasuResponse;
};

describe('Test the EtasuStatus Component', () => {
  function expectContains(value: string) {
    const element = screen.getByText(value);
    expect(element).toBeInTheDocument();
  }

  test('Contains all elements', () => {
    const update = false;

    // render the module
    render(<EtasuStatus callback={() => {}} update={update} remsAdminResponse={null} />);

    // test the status fields and headings are present
    expectContains('REMS Status');
    expectContains('Case Number: N/A');
    expectContains('Status: N/A');
    expectContains('ETASU');
    expectContains('Not Available');

    // check the refresh button is present
    const refreshButton = screen.getByTestId('refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  test('Loads data on start', async () => {
    const update = true;

    const etasuStatus = generateEtasuStatus();
    let called = false;
    const callback = () => {
      called = true;
    };

    // render the module
    render(<EtasuStatus callback={callback} update={update} remsAdminResponse={null} />);
    // just need to call callback
    expect(called).toBeTruthy();
  });
  test('Renders passed data', async () => {
    // render the module
    const etasu = generateEtasuStatus();
    render(<EtasuStatus callback={() => {}} update={false} remsAdminResponse={etasu} />);

    // verify that the values are updated from the call to get the ETASU
    expect(await screen.findByText('Case Number: ' + etasu.case_number)).toBeInTheDocument();
    expect(await screen.findByText('Status: ' + etasu.status)).toBeInTheDocument();
    expect(await screen.findAllByTestId('etasu-item')).toHaveLength(3);
  });
  test('Update retrieves data', async () => {
    const update = false;
    let called = false;
    const callback = () => {
      called = true;
    };

    // render the module
    render(<EtasuStatus callback={callback} update={update} remsAdminResponse={null} />);
    expect(called).toBeFalsy();
    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    expect(called).toBeTruthy();
  });

  test('Failed to load status', async () => {
    const update = false;

    // render the module
    render(<EtasuStatus callback={() => {}} update={update} remsAdminResponse={null} />);

    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    expect(await screen.findByText('Case Number: N/A')).toBeInTheDocument();
    expect(await screen.findByText('Status: N/A')).toBeInTheDocument();
    expect(await screen.findByText('Not Available')).toBeInTheDocument();
  });
});
