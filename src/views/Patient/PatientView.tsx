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
import { MedicationRequest, Patient, Practitioner } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useReducer, useState } from 'react';
import MedReqDropDown from './MedReqDropDown/MedReqDropDown';
import './PatientView.css';
import { Hook, Card as HooksCard } from '../../cds-hooks/resources/HookTypes';
import axios from 'axios';
import * as env from 'env-var';
import PatientViewHook from '../../cds-hooks/resources/PatientView';
import { hydrate } from '../../cds-hooks/prefetch/PrefetchHydrator';
import example from '../../cds-hooks/prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service

interface PatientViewProps {
  client: Client;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
}

export interface MedicationBundle {
  data: MedicationRequest[];
  reference: Patient;
}

export type HooksAction = {
  type: 'replace' | 'append';
  value: HooksCard[];
};

function reducer(state: HooksCard[], action: HooksAction): HooksCard[] {
  switch (action.type) {
    case 'replace':
      return action.value;
    case 'append':
      return [...state, ...action.value];
    default:
      return state;
  }
}

function PatientView(props: PatientViewProps) {
  function getFhirResource(token: string) {
    console.log('getFhirResource: ' + token);
    return client.request(token).then((e: any) => {
      return e;
    });
  }

  const client = props.client;

  const [hooksCards, setHooksCards] = useReducer(reducer, [] as HooksCard[]);

  const [cdsHook, setCDSHook] = useState<Hook | null>(null);

  //Prefetch
  const [patient, setPatient] = useState<Patient | null>(null);

  const [user, setUser] = useState<string | null>(null);

  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);

  useEffect(() => {
    client.patient.read().then((patient: any) => setPatient(patient));
    if (client.user.id) {
      setUser(client.user.id);
      client.user.read().then(response => {
        const practitioner = response as Practitioner;
        setPractitioner(practitioner);
      });
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

      hydrate(getFhirResource, example.prefetch, tempHook).then(() => {
        setCDSHook(tempHook);
      });
    }
  }, [patient, user]);

  const submitToREMS = () => {
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
        console.log(response.data.cards);
        setHooksCards({ type: 'append', value: response.data.cards });
        // should I append the order-sign cards on top of the patient-view cards?
        // or no, just reuse the GUI element but keep the two types of hooks' cards alone
      },
      error => {
        console.log(error);
      }
    );
  };

  useEffect(() => {
    if (cdsHook) {
      submitToREMS();
    }
  }, [cdsHook]);

  // MedicationRequest Prefetching Bundle
  const [medication, setMedication] = useState<MedicationBundle | null>(null);

  const getMedicationRequest = () => {
    client
      .request(`MedicationRequest?subject=Patient/${client.patient.id}`, {
        resolveReferences: ['subject', 'performer'],
        graph: false,
        flat: true
      })
      .then((result: MedicationBundle) => {
        setMedication(result);
      });
  };

  useEffect(() => {
    getMedicationRequest();
  }, []);

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
                <Grid container>
                  <Grid item xs={10} sm={11} md={12} lg={10} alignSelf="center">
                    <Typography component="h1" variant="h5">
                      Patient information loaded from patient context
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sm={1} md={12} lg={2}>
                    <IconButton color="primary" onClick={submitToREMS} size="large">
                      <RefreshIcon fontSize="large" />
                    </IconButton>
                  </Grid>
                </Grid>
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
            <MedReqDropDown
              client={client}
              tabCallback={props.tabCallback}
              hooksCards={hooksCards}
              setHooksCards={setHooksCards}
              medication={medication}
              patient={patient}
              user={user}
              practitioner={practitioner}
              getFhirResource={getFhirResource}
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
