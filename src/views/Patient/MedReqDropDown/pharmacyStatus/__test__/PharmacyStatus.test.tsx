import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MedicationDispense, BundleEntry  } from 'fhir/r4';

import PharmacyStatus from '../PharmacyStatus';

const testMedicationDispense: BundleEntry<MedicationDispense> = {
  'resource': {
    'resourceType': 'MedicationDispense',
    'id': 'pat017-mr-turalio-dispense',
    'meta': {
        'versionId': '4',
        'lastUpdated': '2024-02-08T16:02:57.850+00:00',
        'source': '#pat017-mr-turali'
    },
    'status': 'completed',
    'medicationCodeableConcept': {
        'coding': [
            {
                'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
                'code': '2183126',
                'display': 'Turalio 200 MG Oral Capsule'
            },
            {
                'system': 'http://hl7.org/fhir/sid/ndc',
                'code': '65597-402-20'
            }
        ]
    },
    'subject': {
        'reference': 'Patient/pat017',
        'display': 'Jon Snow'
    },
    'authorizingPrescription': [
        {
            'reference': 'MedicationRequest/pat017-mr-turalio'
        }
    ]
  }
};

describe('Test the PharmacyStatus Component', () => {
  function expectContains(value: string) {
    const element = screen.getByText(value);
    expect(element).toBeInTheDocument();
  }

  test('Contains all elements', () => {
    const update = false;

    // render the module
    render(<PharmacyStatus update={update} callback={() => {}} testEhrResponse={null} />);

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
    render(<PharmacyStatus update={false} callback={() => {}} testEhrResponse={testMedicationDispense} />);
    expect(await screen.findByText(`ID: ${testMedicationDispense.resource?.id}`)).toBeInTheDocument();
    expect(await screen.findByText(`Status: ${testMedicationDispense.resource?.status}`)).toBeInTheDocument();

  });

  test('Loads data on start', () => {
    const update = true;
    let pimsResponse = false;
    const callback = () => {
      pimsResponse = true;
    };
    // render the module
    render(<PharmacyStatus update={update} callback={callback} testEhrResponse={null} />);
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
    render(<PharmacyStatus update={update} callback={callback} testEhrResponse={null} />);

    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    // verify that the values are updated from the call to get the Pharmacy Status
    expect(called).toBe(true);
  });

  test('Failed to load status', async () => {
    const update = true;
    // render the module
    render(<PharmacyStatus update={update} callback={() => {}} testEhrResponse={null} />);

    // click the refresh button
    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);

    // verify that the values are updated from the call to get the Pharmacy Status
    expect(await screen.findByText('ID: N/A')).toBeInTheDocument();
    expect(await screen.findByText('Status: N/A')).toBeInTheDocument();
  });
});
