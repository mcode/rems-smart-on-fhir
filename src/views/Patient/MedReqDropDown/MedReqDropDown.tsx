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
import { BundleEntry, Patient, MedicationRequest, Practitioner, Resource } from 'fhir/r4';
import Client from 'fhirclient/lib/Client';
import { ReactElement, useEffect, useState } from 'react';
import example from '../../../cds-hooks/prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service
import { hydrate } from '../../../cds-hooks/prefetch/PrefetchHydrator';
import { Hook, Card as HooksCard, OrderSelectHook } from '../../../cds-hooks/resources/HookTypes';
import OrderSelect from '../../../cds-hooks/resources/OrderSelect';
import { getDrugCodeFromMedicationRequest } from '../../Questionnaire/questionnaireUtil';
import './MedReqDropDown.css';
import * as env from 'env-var';
import { MedicationBundle, submitToREMS } from '../PatientView';

// Adding in cards
import CdsHooksCards from './cdsHooksCards/cdsHooksCards';

// Adding in ETASU
import EtasuStatus from './etasuStatus/EtasuStatus';

// Adding in Pharmacy
import PharmacyStatus from './pharmacyStatus/PharmacyStatus';
import sendRx from './rxSend/rxSend';

interface MedReqDropDownProps {
  client: Client;
  getFhirResource: (token: string) => Promise<Resource>;
  hooksCards: HooksCard[];
  medication: MedicationBundle | null;
  patient: Patient | null;
  practitioner: Practitioner | null;
  setHooksCards: React.Dispatch<React.SetStateAction<HooksCard[]>>;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
  user: string | null;
}

function MedReqDropDown({
  client,
  getFhirResource,
  hooksCards,
  medication,
  patient,
  practitioner,
  setHooksCards,
  tabCallback,
  user
}: MedReqDropDownProps) {
  //For dropdown UI
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleOptionSelect = (event: SelectChangeEvent<string>) => {
    setSelectedOption(event.target.value as string);
  };

  //CDSHooks
  const [cdsHook, setCDSHook] = useState<Hook | null>(null);

  //ETASU
  const [showEtasu, setShowEtasu] = useState<boolean>(false);

  // Pharmacy
  const [showPharmacy, setShowPharmacy] = useState<boolean>(false);

  const [sendRxEnabled, setSendRxEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (cdsHook) {
      submitToREMS(cdsHook, setHooksCards);
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
      let tempHook: OrderSelectHook;
      if (env.get('REACT_APP_SEND_FHIR_AUTH_ENABLED').asBool()) {
        tempHook = hook.generate(client);
      } else {
        tempHook = hook.generate();
      }
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
                      <IconButton
                        color="primary"
                        onClick={() => submitToREMS(cdsHook, setHooksCards)}
                        size="large"
                      >
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

            <CdsHooksCards
              cards={hooksCards}
              client={client}
              name={medicationName}
              tabIndex={tabIndex}
              setTabIndex={setTabIndex}
              tabCallback={tabCallback}
            />
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
