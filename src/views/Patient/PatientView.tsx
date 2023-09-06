import {
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography
} from '@mui/material';
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

  const rows: { header: string; data: string }[] = [
    { header: 'ID', data: patient?.['id'] || '' },
    {
      header: 'Full Name',
      data: `${patient?.name?.[0]?.given?.[0]} ${patient?.name?.[0]?.family}`
    },
    { header: 'Gender', data: patient?.['gender'] || '' },
    { header: 'Date of Birth', data: patient?.['birthDate'] || '' },
    {
      header: 'Address',
      data: `${(patient?.address?.[0].line, patient?.address?.[0]['city'])}\n${
        patient?.address?.[0]?.state
      }, ${patient?.address?.[0]?.postalCode}`
    }
  ];

  return (
    <Box flexGrow={1}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          {patient ? (
            <Card sx={{ bgcolor: 'white' }}>
              <CardContent>
                <Typography component="h1" variant="h5">
                  Patient information loaded from patient context
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      {rows.map(({ header, data }) => (
                        <TableRow key={header}>
                          <TableCell component="th" scope="row" variant="head">
                            {header}
                          </TableCell>
                          <TableCell variant="body">{data}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            <Typography component="h1" variant="h5">
              Loading patient info...
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} md={8}>
          {client ? (
            <MedReqDropDown client={client} tabCallback={props.tabCallback} />
          ) : (
            <p>Loading medication request...</p>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default PatientView;
