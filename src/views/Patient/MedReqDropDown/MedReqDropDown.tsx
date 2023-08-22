import {
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  Modal
} from '@mui/material';
import Box from '@mui/material/Box';
import axios from 'axios';
import { BundleEntry, Patient, MedicationRequest, Practitioner } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useState } from 'react';
import example from '../../../cds-hooks/prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service
import { hydrate } from '../../../cds-hooks/prefetch/PrefetchHydrator';
import { Hook, Card as HooksCard } from '../../../cds-hooks/resources/HookTypes';
import OrderSelect from '../../../cds-hooks/resources/OrderSelect';
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
  reference: Patient;
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
  const SubmitToREMS = () => {
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
      SubmitToREMS();
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

  // MedicationRequest Prefectching Bundle
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

  const [selectedMedicationCardBundle, setselectedMedicationCardBundle] =
    useState<BundleEntry<MedicationRequest>>();

  const [selectedMedicationCard, setselectedMedicationCard] = useState<MedicationRequest>();
  const [medicationName, setMedicationName] = useState<string>('');
  const [tabIndex, setTabIndex] = useState<number>(1);
  useEffect(() => {
    if (selectedOption != '') {
      setselectedMedicationCard(
        medication?.data.find(medication => medication.id === selectedOption)
      );
    }
  }, [selectedOption]);

  useEffect(() => {
    if (selectedMedicationCard) {
      const medName =
        selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].display?.split(' ')[0];
      if (medName) {
        setMedicationName(medName);
      }
      setselectedMedicationCardBundle({ resource: selectedMedicationCard });
    }
  }, [selectedMedicationCard]);

  useEffect(() => {
    if (patient && patient.id && user && selectedMedicationCardBundle) {
      const resourceId = `${selectedMedicationCardBundle.resource?.resourceType}/${selectedMedicationCardBundle.resource?.id}`;
      const hook = new OrderSelect(patient.id, user, {
        resourceType: 'Bundle',
        type: 'batch',
        entry: [selectedMedicationCardBundle],
      }, [resourceId]);
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

  const etasu_status_enabled: boolean = env.get('REACT_APP_ETASU_STATUS_ENABLED').asBool() ? true : false;
  const pharmacy_status_enabled: boolean = env.get('REACT_APP_PHARMACY_STATUS_ENABLED').asBool() ? true : false;

  return (
    <div>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '800px'
        }}
      >
        <div className="MedReqDropDown">
          <div>
            <Card sx={{ minWidth: 500, maxWidth: 5000, bgcolor: 'white', p: 5 }}>
              <CardContent>
                <Typography
                  sx={{ fontSize: 17 }}
                  color="text.secondary"
                  gutterBottom
                  component="div"
                >
                  Select Medication Request:
                </Typography>
                <FormControl sx={{ minWidth: 300, mt: 1 }}>
                  <InputLabel id="dropdown-label">Select Medication</InputLabel>
                  <Select
                    labelId="dropdown-label"
                    id="dropdown"
                    value={selectedOption}
                    onChange={handleOptionSelect}
                  >
                    <MenuItem value="">
                      <em>Select Medication</em>
                    </MenuItem>
                    {medication ? (
                      medication.data.map(medications => (
                        <MenuItem key={medications.id} value={medications.id}>
                          {medications.medicationCodeableConcept?.coding?.[0].display}
                        </MenuItem>
                      ))
                    ) : (
                      <p>loading medications...</p>
                    )}
                  </Select>
                </FormControl>
              </CardContent>
              {selectedMedicationCard && (
                <CardContent>
                  <Typography
                    sx={{ bgcolor: 'text.secondary', color: 'white', textAlign: 'center' }}
                  >
                    Code: {selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].code}
                  </Typography>
                  <Typography
                    sx={{
                      bgcolor: 'text.disabled',
                      color: 'white',
                      textAlign: 'center',
                      fontSize: 24
                    }}
                  >
                    {medicationName}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ bgcolor: 'text.disabled', color: 'white', textAlign: 'center' }}
                    color="textSecondary"
                    gutterBottom
                  >
                    {selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].display}
                  </Typography>
                  {etasu_status_enabled && (
                    <Button variant="contained" onClick={handleOpenCheckETASU}>
                      Check ETASU
                    </Button>
                  )}
                  {pharmacy_status_enabled && (
                    <Button variant="contained" onClick={handleOpenCheckPharmacy}>
                      Check Pharmacy
                    </Button>
                  )}
                  {sendRxEnabled && (
                    <Button variant="contained" onClick={handleSendRx}>
                      Send RX to PIMS
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
            {selectedOption ? (
              <Card>
                <CardContent>
                  <CdsHooksCards
                    cards={hooksCards}
                    client={client}
                    name={medicationName}
                    tabIndex={tabIndex}
                    setTabIndex={setTabIndex}
                    tabCallback={props.tabCallback}
                  ></CdsHooksCards>
                </CardContent>
              </Card>
            ) : (
              <p></p>
            )}
          </div>
        </div>
      </Box>
      <Modal open={showEtasu} onClose={handleCloseCheckETASU}>
        <Box sx={modal_style}>
          <EtasuStatus
            patient={patient}
            medication={selectedMedicationCard}
            update={showEtasu}
          ></EtasuStatus>
        </Box>
      </Modal>
      <Modal open={showPharmacy} onClose={handleCloseCheckPharmacy}>
        <Box sx={modal_style}>
          <PharmacyStatus
            patient={patient}
            medication={selectedMedicationCard}
            update={showPharmacy}
          ></PharmacyStatus>
        </Box>
      </Modal>
    </div>
  );
}

export default MedReqDropDown;
