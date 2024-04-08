import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParametersParameter, Parameters } from 'fhir/r4';

import EtasuStatus from '../EtasuStatus';

const generateEtasuStatus = () => {
  const patientEnrollmentForm: ParametersParameter = {
    name: 'Patient Enrollment',
    resource: {
      resourceType: 'GuidanceResponse',
      status: 'success',
      moduleUri: 'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/',
      subject: {
        reference: 'Patient/pat017'
      },
      note: [
        {
          text: 'Patient Enrollment'
        }
      ]
    }
  };
  const prescriberEnrollmentForm: ParametersParameter = {
    name: 'Prescriber Enrollment',
    resource: {
      resourceType: 'GuidanceResponse',
      status: 'data-required',
      moduleUri: 'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/',
      subject: {
        reference: 'Practitioner/pra1234'
      },
      note: [
        {
          text: 'Prescriber Enrollment'
        }
      ]
    }
  };
  const pharmacistEnrollmentForm: ParametersParameter = {
    name: 'Pharmacist Enrollment',
    resource: {
      resourceType: 'GuidanceResponse',
      status: 'success',
      moduleUri: 'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/',
      subject: {
        reference: 'Organization/pharm0111'
      },
      note: [
        {
          text: 'Pharmacist Enrollment'
        }
      ]
    }
  };

  const remsMetEtasuResponse: Parameters = {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'rems-etasu',
        resource: {
          resourceType: 'GuidanceResponse',
          status: 'data-required',
          moduleUri: 'https://build.fhir.org/ig/HL7/fhir-medication-rems-ig/',
          subject: {
            reference: 'Patient/pat017'
          },
          outputParameters: {
            reference: '#etasuOutputParameters'
          },
          contained: [
            {
              resourceType: 'Parameters',
              id: 'etasuOutputParameters',
              parameter: [patientEnrollmentForm, prescriberEnrollmentForm, pharmacistEnrollmentForm]
            }
          ]
        }
      }
    ]
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
    expectContains('Status: N/A');
    expectContains('ETASU');
    expectContains('Not Available');

    // check the refresh button is present
    const refreshButton = screen.getByTestId('refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  test('Loads data on start', async () => {
    const update = true;
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
    if (etasu.parameter?.[0]?.resource?.resourceType === 'GuidanceResponse') {
      render(
        <EtasuStatus
          callback={() => {}}
          update={false}
          remsAdminResponse={etasu.parameter[0].resource}
        />
      );

      // verify that the values are updated from the call to get the ETASU
      expect(
        await screen.findByText('Status: ' + etasu.parameter[0].resource.status)
      ).toBeInTheDocument();
      expect(await screen.findAllByTestId('etasu-item')).toHaveLength(3);
    }
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

    expect(await screen.findByText('Status: N/A')).toBeInTheDocument();
    expect(await screen.findByText('Not Available')).toBeInTheDocument();
  });
});
