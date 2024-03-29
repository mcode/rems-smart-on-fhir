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
import { BundleEntry, Patient, MedicationRequest, Resource, MedicationDispense } from 'fhir/r4';
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
import MetRequirements from './etasuStatus/MetRequirements';
import RemsMetEtasuResponse from './etasuStatus/RemsMetEtasuResponse';

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
  const [remsAdminResponse, setRemsAdminResponse] = useState<RemsMetEtasuResponse | null>(null);
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
    // setSpin(true);
    const patientFirstName = patient?.name?.at(0)?.given?.at(0);
    const patientLastName = patient?.name?.at(0)?.family;
    const patientDOB = patient?.birthDate;
    let drugCode = undefined;
    setCheckedEtasuTime(Date.now());
    if (selectedMedicationCard) {
      drugCode = getDrugCodeFromMedicationRequest(selectedMedicationCard)?.code;
    }
    console.log(
      'refreshEtasuBundle: ' +
        patientFirstName +
        ' ' +
        patientLastName +
        ' - ' +
        patientDOB +
        ' - ' +
        drugCode
    );
    const etasuUrl = `${env
      .get('REACT_APP_REMS_ADMIN_SERVER_BASE')
      .asString()}/etasu/met/patient/${patientFirstName}/${patientLastName}/${patientDOB}/drugCode/${drugCode}`;

    axios({
      method: 'get',
      url: etasuUrl
    }).then(
      response => {
        // Sorting an array mutates the data in place.
        const remsMetRes = response.data as RemsMetEtasuResponse;
        if (remsMetRes.metRequirements) {
          remsMetRes.metRequirements.sort((first: MetRequirements, second: MetRequirements) => {
            // Keep the other forms unsorted.
            if (second.requirementName.includes('Patient Status Update')) {
              // Sort the Patient Status Update forms in descending order of timestamp.
              return second.requirementName.localeCompare(first.requirementName);
            }
            return 0;
          });
        }
        console.log(response.data);
        setRemsAdminResponse(response.data);
      },
      error => {
        console.log(error);
      }
    );
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
  let color = '#0c0c0c'; // gray
  if (remsAdminResponse?.status === 'Approved') {
    color = '#5cb85c'; // green
  } else if (remsAdminResponse?.status === 'Pending') {
    color = '#f0ad4e'; // orange
  }

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
    backgroundColor: color,
    ':hover': { filter: 'brightness(110%)', backgroundColor: color }
  };
  const pharmSx = {
    backgroundColor: pColor,
    ':hover': { filter: 'brightness(110%)', backgroundColor: pColor }
  };
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
                      <Grid item sm={4} md={4} lg={4}>
                        <Button
                          className="etasuButton"
                          sx={etasuSx}
                          variant="contained"
                          onClick={handleOpenCheckETASU}
                        >
                          <div>
                            <ListIcon fontSize="large" />
                            <p className="etasuButtonText">ETASU: </p>
                            <p>{remsAdminResponse?.status || 'Not Started'}</p>
                          </div>
                        </Button>
                        {renderTimestamp(checkedEtasuTime)}
                      </Grid>
                    )}
                    {pharmacy_status_enabled && (
                      <Grid item sm={4} md={4} lg={4}>
                        <Button
                          className="etasuButton"
                          sx={pharmSx}
                          variant="contained"
                          onClick={handleOpenCheckPharmacy}
                        >
                          <div>
                            <LocalPharmacyIcon fontSize="large" />
                            <p className="etasuButtonText">Medication: </p>
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
