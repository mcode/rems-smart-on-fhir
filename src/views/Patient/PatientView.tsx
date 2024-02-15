import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MedicationRequest, Patient } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useState } from 'react';
import MedReqDropDown from './MedReqDropDown/MedReqDropDown';
import './PatientView.css';
import { Hook, Card as HooksCard } from '../../cds-hooks/resources/HookTypes';
import axios from 'axios';
import * as env from 'env-var';
import PatientViewHook from '../../cds-hooks/resources/PatientView';
import { hydrate } from '../../cds-hooks/prefetch/PrefetchHydrator';

interface PatientViewProps {
  client: Client;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
}
type InfoRow = { header: string; data: string }[];

export interface MedicationBundle {
  data: MedicationRequest[];

  // This is a json object with the key of each element matching the
  // contained FHIR resource
  references: any;
}

//CDS-Hook Request to REMS-Admin for cards
export const submitToREMS = (
  cdsHook: Hook | null,
  setHooksCards: React.Dispatch<React.SetStateAction<HooksCard[]>>
) => {
  const hookType = (cdsHook && cdsHook.hook) || 'NO_SUCH_HOOK';
  axios({
    method: 'post',
    url:
      `${env.get('REACT_APP_REMS_ADMIN_SERVER_BASE').asString()}` +
      `${env.get('REACT_APP_REMS_HOOKS_PATH').asString()}` +
      hookType,
    data: cdsHook
  }).then(
    response => {
      setHooksCards(response.data.cards);
    },
    error => console.log(error)
  );
};

function PatientView(props: PatientViewProps) {
  function getFhirResource(token: string) {
    console.log('getFhirResource: ' + token);
    return client.request(token).then((e: any) => {
      return e;
    });
  }

  const client = props.client;

  const [hooksCards, setHooksCards] = useState([] as HooksCard[]);

  const [cdsHook, setCDSHook] = useState<Hook | null>(null);

  //Prefetch
  const [patient, setPatient] = useState<Patient | null>(null);

  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    client.patient.read().then((patient: Patient) => setPatient(patient));
    if (client.user.id) {
      setUser(client.user.id);
    } else {
      const appContextString = client.state?.tokenResponse?.appContext;
      const appContext: { [key: string]: string } = {};
      appContextString.split('&').map((e: string) => {
        const temp: string[] = e.split('=');
        appContext[temp[0]] = temp[1];
      });
      setUser(appContext?.user);
    }
  }, [client.patient, client]);

  useEffect(() => {
    if (patient && patient.id && user) {
      const hook = new PatientViewHook(patient.id, user);
      const tempHook = hook.generate();

      hydrate(
        getFhirResource,
        {
          patient: 'Patient/{{context.patientId}}',
          practitioner: 'Practitioner/{{context.userId}}',
          medicationRequests:
            'MedicationRequest?subject={{context.patientId}}&_include=MedicationRequest:medication'
        },
        tempHook
      ).then(() => {
        setCDSHook(tempHook);
      });
    }
  }, [patient, user]);

  useEffect(() => {
    if (cdsHook) {
      submitToREMS(cdsHook, setHooksCards);
    }
  }, [cdsHook]);

  // MedicationRequest Prefetching Bundle
  const [medication, setMedication] = useState<MedicationBundle | null>(null);

  const getMedicationRequest = () => {
    client
      .request(`MedicationRequest?subject=Patient/${client.patient.id}`, {
        resolveReferences: ['subject', 'performer', 'medicationReference'],
        graph: false,
        flat: true
      })
      .then((result: MedicationBundle) => {
        result.data.forEach(e => {
          if (e?.resourceType === 'MedicationRequest') {
            if (e?.medicationReference) {
              const medicationReference = e?.medicationReference?.reference;

              if (medicationReference) {
                // find the matching medication in the references
                const medication = result?.references?.[medicationReference];

                if (medication) {
                  const code = medication?.code?.coding?.[0];

                  if (code) {
                    // add the reference as a contained resource to the request
                    if (!e?.contained) {
                      e.contained = [];
                      e.contained.push(medication);
                    } else {
                      // only add to contained if not already in there
                      let found = false;
                      e?.contained.forEach(c => {
                        if (c.id === medication.id) {
                          found = true;
                        }
                      });
                      if (!found) {
                        e?.contained.push(medication);
                      }
                    }
                  }
                }
              }
            }
          }
        });

        setMedication(result);
      });
  };

  useEffect(() => {
    getMedicationRequest();
  }, []);

  useEffect(() => {
    client.patient.read().then((patient: any) => setPatient(patient));
  }, [client.patient, client]);

  function getAge(dateString: string) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  const renderRows = (rows: InfoRow) => {
    return rows.map(({ header, data }, i) => {
      let backgroundColor = '#fdfdfd';
      if (i % 2 === 0) {
        // is even
        backgroundColor = '#dcdcdc';
      }
      return (
        <TableRow key={header} sx={{ backgroundColor: backgroundColor }}>
          <TableCell component="th" scope="row" variant="head">
            <span style={{ fontWeight: 'bold' }}>{header}</span>
          </TableCell>
          <TableCell sx={{ whiteSpace: 'pre' }} variant="body">
            {data}
          </TableCell>
        </TableRow>
      );
    });
  };
  let birthday = patient?.birthDate;
  let age;
  if (birthday) {
    age = getAge(birthday);
    birthday = `${birthday} (${age} years old)`;
  }
  const patientName = `${patient?.name?.[0]?.given?.[0]} ${patient?.name?.[0]?.family}`;
  const patientFullName = `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0]?.family}`;
  const rows: InfoRow = [
    {
      header: 'Full Name',
      data: patientFullName
    },
    {
      header: 'Gender',
      data: patient?.['gender']
        ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
        : ''
    },
    { header: 'Date of Birth', data: birthday || '' },
    {
      header: 'Address',
      data: `${patient?.address?.[0].line?.[0]}\n${patient?.address?.[0].city}\n${patient?.address?.[0]?.state}, ${patient?.address?.[0]?.postalCode}`
    }
  ];

  return (
    <Box flexGrow={1}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          {patient ? (
            <Card sx={{ bgcolor: 'white' }}>
              <CardContent>
                <Grid container>
                  <Grid item xs={10} sm={11} md={10} lg={10} alignSelf="center">
                    <Typography component="h1" variant="h5">
                      Patient:
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sm={1} md={2} lg={2}>
                    <IconButton
                      color="primary"
                      onClick={() => submitToREMS(cdsHook, setHooksCards)}
                      size="large"
                    >
                      <RefreshIcon fontSize="large" />
                    </IconButton>
                  </Grid>
                  <Grid item xs={12} sm={12} md={12} lg={12}>
                    <h5 style={{ paddingLeft: '16px', paddingBottom: '16px' }}>
                      <span style={{ fontWeight: 'bold' }}>{patientName}</span>{' '}
                      {`(ID: ${patient.id})`}
                    </h5>
                  </Grid>
                </Grid>
                <TableContainer>
                  <Table>
                    <TableBody>{renderRows(rows)}</TableBody>
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
            <MedReqDropDown
              client={client}
              getFhirResource={getFhirResource}
              hooksCards={hooksCards}
              medication={medication}
              patient={patient}
              setHooksCards={setHooksCards}
              tabCallback={props.tabCallback}
              user={user}
            />
          ) : (
            <p>Loading medication request...</p>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default PatientView;
