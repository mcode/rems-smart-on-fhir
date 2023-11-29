import {
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  Modal,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import axios from 'axios';
import { BundleEntry, Patient, MedicationRequest, Medication, Practitioner } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useState } from 'react';
import example from '../../../cds-hooks/prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service
import { hydrate } from '../../../cds-hooks/prefetch/PrefetchHydrator';
import { Hook, Card as HooksCard } from '../../../cds-hooks/resources/HookTypes';
import OrderSelect from '../../../cds-hooks/resources/OrderSelect';
import { getDrugCodeFromMedicationRequest } from '../../Questionnaire/questionnaireUtil';
import './MedReqDropDown.css';
import * as env from 'env-var';

// Adding in cards
import CdsHooksCards from './cdsHooksCards/cdsHooksCards';

// Adding in ETASU
import EtasuStatus from './etasuStatus/EtasuStatus';

// Adding in Pharmacy
import PharmacyStatus from './pharmacyStatus/PharmacyStatus';
import sendRx from './rxSend/rxSend';

interface MedicationBundle {
  data: MedicationRequest[];

  // This is a json object with the key of each element matching the  
  // contained FHIR resource
  references: any;
}

interface MedReqDropDownProps {
  tabCallback: (n: ReactElement, m: string, o: string) => void;
  client: Client;
}
function MedReqDropDown(props: MedReqDropDownProps) {
  const client = props.client;

  function getFhirResource(token: string) {
    console.log('getFhirResource: ' + token);
    return props.client.request(token).then((e: any) => {
      return e;
    });
  }

  //For dropdown UI
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleOptionSelect = (event: SelectChangeEvent<string>) => {
    setSelectedOption(event.target.value as string);
  };

  //Prefetch
  const [patient, setPatient] = useState<Patient | null>(null);

  const [user, setUser] = useState<string | null>(null);

  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);

  //CDSHooks
  const [cdsHook, setCDSHook] = useState<Hook | null>(null);

  //Cards
  const [hooksCards, setHooksCards] = useState<HooksCard[]>([]);

  //ETASU
  const [showEtasu, setShowEtasu] = useState<boolean>(false);

  // Pharmacy
  const [showPharmacy, setShowPharmacy] = useState<boolean>(false);

  const [sendRxEnabled, setSendRxEnabled] = useState<boolean>(false);
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
    getMedicationRequest();
  }, []);

  //CDS-Hook Request to REMS-Admin for cards
  const submitToREMS = () => {
    axios({
      method: 'post',
      url:
        `${env.get('REACT_APP_REMS_ADMIN_SERVER_BASE').asString()}` +
        `${env.get('REACT_APP_REMS_HOOKS_PATH').asString()}`,
      data: cdsHook
    }).then(
      response => {
        console.log(response.data.cards); // cards for REMS-333
        setHooksCards(response.data.cards);
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

  const handleOpenCheckETASU = () => {
    setShowEtasu(true);
  };

  const handleCloseCheckETASU = () => {
    setShowEtasu(false);
  };

  const handleOpenCheckPharmacy = () => {
    setShowPharmacy(true);
  };

  const handleCloseCheckPharmacy = () => {
    setShowPharmacy(false);
  };

  const handleSendRx = () => {
    const med = selectedMedicationCardBundle?.resource;
    if (med && patient && practitioner) {
      sendRx(patient, practitioner, med);
    }
  };

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

          if (e?.medicationReference) {
            const medicationReference = e?.medicationReference?.reference;
          }

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
                        if (medication.id === medication.id) {
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

  const [selectedMedicationCardBundle, setSelectedMedicationCardBundle] =
    useState<BundleEntry<MedicationRequest>>();

  const [selectedMedicationCard, setSelectedMedicationCard] = useState<MedicationRequest>();
  const [medicationName, setMedicationName] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(1);

  useEffect(() => {
    if (selectedOption != '') {
      setSelectedMedicationCard(
        medication?.data.find(medication => medication.id === selectedOption)
      );
    }
  }, [selectedOption]);

  useEffect(() => {
    if (selectedMedicationCard) {
      const medName =
        getDrugCodeFromMedicationRequest(selectedMedicationCard)?.display?.split(' ')[0];
      if (medName) {
        setMedicationName(medName);
      }
      setSelectedMedicationCardBundle({ resource: selectedMedicationCard });
    }
  }, [selectedMedicationCard]);

  useEffect(() => {
    if (patient && patient.id && user && selectedMedicationCardBundle) {
      const resourceId = `${selectedMedicationCardBundle.resource?.resourceType}/${selectedMedicationCardBundle.resource?.id}`;
      const hook = new OrderSelect(
        patient.id,
        user,
        {
          resourceType: 'Bundle',
          type: 'batch',
          entry: [selectedMedicationCardBundle]
        },
        [resourceId]
      );
      const tempHook = hook.generate();

      hydrate(getFhirResource, example.prefetch, tempHook).then(() => {
        setCDSHook(tempHook);
      });
    }
  }, [selectedMedicationCardBundle]);

  useEffect(() => {
    if (
      patient &&
      practitioner &&
      selectedMedicationCardBundle &&
      env.get('REACT_APP_SEND_RX_ENABLED').asBool() === true
    ) {
      setSendRxEnabled(true);
    } else {
      setSendRxEnabled(false);
    }
  }, [patient, practitioner, selectedMedicationCardBundle]);

  const modal_style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '1px solid #000',
    boxShadow: 24,
    p: 4
  };

  const etasu_status_enabled: boolean = env.get('REACT_APP_ETASU_STATUS_ENABLED').asBool()
    ? true
    : false;
  const pharmacy_status_enabled: boolean = env.get('REACT_APP_PHARMACY_STATUS_ENABLED').asBool()
    ? true
    : false;

  const label = 'Select Medication Request';
  return (
    <>
      <Card sx={{ bgcolor: 'white' }}>
        <CardContent>
          <Grid item container spacing={2}>
            <Grid item container alignItems="left" direction="column" spacing={2}>
              <Grid item>
                <FormControl fullWidth>
                  <InputLabel id="dropdown-label">{label}</InputLabel>
                  <Select
                    labelId="dropdown-label"
                    id="dropdown"
                    label={label}
                    value={selectedOption}
                    onChange={handleOptionSelect}
                  >
                    {medication ? (
                      medication.data.map(medications => (
                        <MenuItem key={medications.id} value={medications.id}>
                          {getDrugCodeFromMedicationRequest(medications)?.display}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem>Loading medications...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {selectedMedicationCard && (
                <>
                  <Grid item container>
                    <Grid item xs={10} sm={11}>
                      <Typography bgcolor="text.secondary" color="white" textAlign="center">
                        Code: {getDrugCodeFromMedicationRequest(selectedMedicationCard)?.code}
                      </Typography>
                      <Typography
                        bgcolor="text.disabled"
                        variant="h5"
                        textAlign="center"
                        color="white"
                      >
                        {medicationName}
                      </Typography>
                      <Typography
                        variant="h6"
                        bgcolor="text.disabled"
                        color="white"
                        textAlign="center"
                      >
                        {getDrugCodeFromMedicationRequest(selectedMedicationCard)?.display}
                      </Typography>
                    </Grid>
                    <Grid
                      item
                      container
                      xs={2}
                      sm={1}
                      alignContent="center"
                      justifyContent="center"
                    >
                      <IconButton color="primary" onClick={submitToREMS} size="large">
                        <RefreshIcon fontSize="large" />
                      </IconButton>
                    </Grid>
                  </Grid>

                  <Grid item container justifyContent="center" spacing={2}>
                    {etasu_status_enabled && (
                      <Grid item>
                        <Button variant="contained" onClick={handleOpenCheckETASU}>
                          Check ETASU
                        </Button>
                      </Grid>
                    )}
                    {pharmacy_status_enabled && (
                      <Grid item>
                        <Button variant="contained" onClick={handleOpenCheckPharmacy}>
                          Check Pharmacy
                        </Button>
                      </Grid>
                    )}
                    {sendRxEnabled && (
                      <Grid item>
                        <Button variant="contained" onClick={handleSendRx}>
                          Send RX to PIMS
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </>
              )}
            </Grid>

            {selectedOption && (
              <CdsHooksCards
                cards={hooksCards}
                client={client}
                name={medicationName}
                tabIndex={tabIndex}
                setTabIndex={setTabIndex}
                tabCallback={props.tabCallback}
              />
            )}
          </Grid>
        </CardContent>
      </Card>
      <Modal open={showEtasu} onClose={handleCloseCheckETASU}>
        <Box sx={modal_style}>
          <EtasuStatus patient={patient} medication={selectedMedicationCard} update={showEtasu} />
        </Box>
      </Modal>
      <Modal open={showPharmacy} onClose={handleCloseCheckPharmacy}>
        <Box sx={modal_style}>
          <PharmacyStatus
            patient={patient}
            medication={selectedMedicationCard}
            update={showPharmacy}
          />
        </Box>
      </Modal>
    </>
  );
}

export default MedReqDropDown;
