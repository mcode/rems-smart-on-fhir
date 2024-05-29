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
import ListIcon from '@mui/icons-material/List';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import {
  BundleEntry,
  Patient,
  MedicationRequest,
  Resource,
  MedicationDispense,
  Parameters,
  GuidanceResponse
} from 'fhir/r4';
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
import axios from 'axios';

interface MedReqDropDownProps {
  client: Client;
  getFhirResource: (token: string) => Promise<Resource>;
  hooksCards: HooksCard[];
  medication: MedicationBundle | null;
  patient: Patient | null;
  setHooksCards: React.Dispatch<React.SetStateAction<HooksCard[]>>;
  tabCallback: (n: ReactElement, m: string, o: string) => void;
  user: string | null;
}

export interface etasuStatus {
  color: string;
  display: string | undefined;
}
export function getStatus(etasuResource: GuidanceResponse | null | undefined): etasuStatus {
  let color = '#0c0c0c'; // gray
  let display;
  if (etasuResource?.status === 'success') {
    color = '#5cb85c'; // green
    display = 'Approved';
  } else if (etasuResource?.status === 'data-required') {
    color = '#f0ad4e'; // orange
    display = 'Pending';
  }
  return { color, display };
}
function MedReqDropDown({
  client,
  getFhirResource,
  hooksCards,
  medication,
  patient,
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
  const [remsAdminResponse, setRemsAdminResponse] = useState<GuidanceResponse | null>(null);
  const [checkedEtasuTime, setCheckedEtasuTime] = useState(0);
  // Pharmacy
  const [showPharmacy, setShowPharmacy] = useState<boolean>(false);
  const [testEhrResponse, setTestEhrResponse] = useState<BundleEntry<MedicationDispense> | null>(
    null
  );
  const [checkedPharmacyTime, setCheckedPharmacyTime] = useState(0);

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
    refreshEtasuBundle();
    refreshPharmacyBundle();
  }, [selectedMedicationCard]);

  const convertTimeDifference = (start: number) => {
    const end = Date.now();
    const difference = end - start;
    const diffMin = difference / 60000;
    let prefix = 'a long time';
    if (diffMin < 1) {
      prefix = 'a few seconds';
    } else if (diffMin > 1 && diffMin < 2) {
      prefix = 'a minute';
    } else if (diffMin > 2 && diffMin < 60) {
      prefix = `${Math.round(diffMin)} minutes`;
    } else if (diffMin > 60 && diffMin < 120) {
      prefix = 'an hour';
    } else if (diffMin > 120 && diffMin < 1440) {
      prefix = `${Math.round(diffMin / 60)} hours`;
    } else if (diffMin > 1440 && diffMin < 2880) {
      prefix = 'a day';
    } else if (diffMin > 2880) {
      prefix = `${Math.round(diffMin / 1440)} days`;
    }
    return `Last checked ${prefix} ago`;
  };
  const refreshPharmacyBundle = () => {
    setCheckedPharmacyTime(Date.now());
    const rxId = selectedMedicationCard?.id;

    const url = `${env
      .get('REACT_APP_DEFAULT_ISS')
      .asString()}/MedicationDispense?prescription=${rxId}`;
    axios({
      method: 'get',
      url: url
    }).then(
      response => {
        setTestEhrResponse(response?.data?.entry ? response?.data?.entry[0] : null);
      },
      error => {
        console.log(error);
      }
    );
  };

  const refreshEtasuBundle = () => {
    if (patient && selectedMedicationCard) {
      setCheckedEtasuTime(Date.now());
      const params: Parameters = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'patient',
            resource: patient
          },
          {
            name: 'medication',
            resource: selectedMedicationCard
          }
        ]
      };
      axios({
        method: 'post',
        url: `${env
          .get('REACT_APP_REMS_ADMIN_SERVER_BASE')
          .asString()}/4_0_0/GuidanceResponse/$rems-etasu`,
        data: params
      }).then(res => {
        const resParams = res.data as Parameters;
        const etasu = resParams.parameter?.find(e => e.name === 'rems-etasu');
        if (etasu && etasu.resource?.resourceType === 'GuidanceResponse') {
          setRemsAdminResponse(etasu.resource);
        }
      });
    }
  };
  const renderTimestamp = (checkedTime: number) => {
    return (
      <div>
        <div className="etasuButtonTimestamp">
          <p>{convertTimeDifference(checkedTime)}</p>
        </div>
        <div className="etasuButtonTimestamp timestampString">
          <p>{new Date(checkedTime).toLocaleString()}</p>
        </div>
      </div>
    );
  };
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
  const eStatus = getStatus(remsAdminResponse);

  const pStatus = testEhrResponse?.resource?.status;
  const getMedicationStatus = (status: string | undefined) => {
    if (status === 'completed') {
      return 'Picked Up';
    } else if (status === 'unknown') {
      return 'Not Started';
    } else {
      return 'N/A';
    }
  };
  let pColor = '#0c0c0c'; // black
  if (pStatus === 'completed') {
    pColor = '#5cb85c'; // green
  }

  const etasuSx = {
    backgroundColor: eStatus.color,
    ':hover': { filter: 'brightness(110%)', backgroundColor: eStatus.color }
  };
  const pharmSx = {
    backgroundColor: pColor,
    ':hover': { filter: 'brightness(110%)', backgroundColor: pColor }
  };
  return (
    <>
      <Card sx={{ bgcolor: 'white', width: '100%', margin: '0 auto 0' }}>
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
                    sx={{ '& #dropdown': { textWrap: 'wrap' } }}
                  >
                    {medication ? (
                      medication.data.map(medications => (
                        <MenuItem
                          key={medications.id}
                          value={medications.id}
                          sx={{ textWrap: 'wrap' }}
                        >
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
                    <Grid item xs={10} sm={11} style={{'backgroundColor': '#D1D1D1'}}>
                      <Typography bgcolor="text.secondary" color="white" textAlign="center">
                        Medication Code:{' '}
                        {getDrugCodeFromMedicationRequest(selectedMedicationCard)?.code}
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

                  <Grid item container justifyContent="center" textAlign="center" spacing={2}>
                    {etasu_status_enabled && (
                      <Grid item xs={12} sm={6}>
                        <Button sx={etasuSx} variant="contained" onClick={handleOpenCheckETASU}>
                          <div>
                            <ListIcon fontSize="large" />
                            <p className="etasuButtonText">ETASU: </p>
                            <p>{eStatus.display || 'Not Started'}</p>
                          </div>
                        </Button>
                        {renderTimestamp(checkedEtasuTime)}
                      </Grid>
                    )}
                    {pharmacy_status_enabled && (
                      <Grid item xs={12} sm={6}>
                        <Button sx={pharmSx} variant="contained" onClick={handleOpenCheckPharmacy}>
                          <div>
                            <LocalPharmacyIcon fontSize="large" />
                            <p className="etasuButtonText">Medication:</p>
                            <p>{getMedicationStatus(pStatus)}</p>
                          </div>
                        </Button>
                        {renderTimestamp(checkedPharmacyTime)}
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
          <EtasuStatus
            callback={refreshEtasuBundle}
            remsAdminResponse={remsAdminResponse}
            update={showEtasu}
          />
        </Box>
      </Modal>
      <Modal open={showPharmacy} onClose={handleCloseCheckPharmacy}>
        <Box sx={modal_style}>
          <PharmacyStatus
            callback={refreshPharmacyBundle}
            testEhrResponse={testEhrResponse}
            update={showPharmacy}
          />
        </Box>
      </Modal>
    </>
  );
}

export default MedReqDropDown;
