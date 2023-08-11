import { Box, Card, CardContent, Typography } from '@mui/material';
import { Patient } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useState } from 'react';
import MedReqDropDown from './MedReqDropDown/MedReqDropDown';
import './PatientView.css';

interface PatientViewProps {
  client: Client;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
}

function PatientView(props: PatientViewProps) {
  const client = props.client;

  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    client.patient.read().then((patient: any) => setPatient(patient));
  }, [client.patient, client]);

  return (
    <div className="Patient">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'fixed'
        }}
      >
        {/* Demo of data from fhir server */}
        <p>Launched with patient context:</p>
        {patient ? (
          <Card sx={{ minWidth: 500, maxWidth: 5000, bgcolor: 'white', p: 5 }}>
            <CardContent>
              <Typography sx={{ fontSize: 17 }} color="text.secondary" gutterBottom>
                Patient Info
              </Typography>
              <Typography variant="h5" component="div">
                {patient.name?.[0]?.given?.[0]} {patient.name?.[0]?.family}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                {patient['birthDate']}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                sex: {patient['gender']}
              </Typography>
              <Typography color="text.disabled">
                {patient.address?.[0].line}, {patient.address?.[0]['city']}
                <br />
                {patient.address?.[0]?.state}, {patient.address?.[0]?.postalCode}
              </Typography>
              <Typography
                sx={{ mt: 1.5, bgcolor: 'text.disabled', color: 'white', textAlign: 'center' }}
              >
                id: {patient['id']}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <h1>Loading...</h1>
        )}
      </Box>
      <Box
        sx={{
          marginTop: 8,
          marginRight: 30,
          marginLeft: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 800
        }}
      >
        {/* Demo of data from fhir server */}
        {client ? (
          <MedReqDropDown client={client} tabCallback={props.tabCallback} />
        ) : (
          <p>Loading Medication Request...</p>
        )}
      </Box>
    </div>
  );
}

export default PatientView;
