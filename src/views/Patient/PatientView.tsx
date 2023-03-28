import { Box, Card, CardContent, Typography } from '@mui/material';
import { Patient } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { useEffect, useState } from 'react';
import example from '../../prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service
import { hydrate } from '../../prefetch/PrefetchHydrator';
import { Hook } from '../../prefetch/resources/HookTypes';
import OrderSign from '../../prefetch/resources/OrderSign';
import MedReqDropDown from './MedReqDropDown/MedReqDropDown';
import medicationRequestBundle from './MedReqDropDown/tempIpledgeMedicationRequest'; // TODO: (REMS-367) Remove
import './PatientView.css';

interface PatientViewProps {
  client: Client
}

function PatientView(props: PatientViewProps) {
  const client = props.client;

  const [patient, setPatient] = useState<Patient | null>(null);

  const [cdsHook, setCDSHook] = useState<Hook | null>(null);

  useEffect(() => {
    client.patient.read().then((patient: any) => setPatient(patient));
  }, [client.patient, client]);

  useEffect(() => {
    if (patient && patient.id && client.user.id) {
      const hook = new OrderSign(patient.id, client.user.id, { resourceType: 'Bundle', type: 'batch', entry: [medicationRequestBundle] })
      const tempHook = hook.generate();

      hydrate(client, example.prefetch, tempHook).then((data) => {
        setCDSHook(tempHook);
      })
    }
  }, [patient, client])

  return (
    <div className='Patient'>
      <Box sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Demo of data from fhir server */}
        <p>Launched with patient context:</p>
        {patient ?
          <Card sx={{ minWidth: 500, maxWidth: 5000, bgcolor: 'white', p: 5 }}>
            <CardContent>
              <Typography sx={{ fontSize: 17 }} color='text.secondary' gutterBottom>
                Patient Info
              </Typography>
              <Typography variant='h5' component='div'>
                {patient.name?.[0]?.given?.[0]} {patient.name?.[0]?.family}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color='text.secondary'>
                {patient['birthDate']}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color='text.secondary'>
                sex: {patient['gender']}
              </Typography>
              <Typography color='text.disabled' >
                {patient.address?.[0].line}, {patient.address?.[0]['city']}
                <br />
                {patient.address?.[0]['state']}, {patient.address?.[0]['postalCode']}
              </Typography>
              <Typography sx={{ mt: 1.5, bgcolor: 'text.disabled', color: 'white', textAlign: 'center' }} >
                id: {patient['id']}
              </Typography>
            </CardContent>
          </Card>
          : <h1>Loading...</h1>}

        {cdsHook ? <MedReqDropDown cdsHook={cdsHook} />
          :
              <p>Loading Medication Request...</p>
        }
      </Box>

    </div>
  );
};

export default PatientView;