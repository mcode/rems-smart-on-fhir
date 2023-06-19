import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Modal } from '@mui/material';
import Box from '@mui/material/Box';
import axios from 'axios';
import { BundleEntry, Patient, MedicationRequest } from 'fhir/r4';
import { useEffect, useState } from 'react';
import example from '../../../cds-hooks/prefetch/exampleHookService.json'; // TODO: Replace with request to CDS service
import { hydrate } from '../../../cds-hooks/prefetch/PrefetchHydrator';
import { Hook, Card as HooksCard } from '../../../cds-hooks/resources/HookTypes';
import OrderSign from '../../../cds-hooks/resources/OrderSign';
import './MedReqDropDown.css';

// Adding in cards 
import CdsHooksCards from './cdsHooksCards/cdsHooksCards';

// Adding in ETASU
import EtasuStatus from './etasuStatus/EtasuStatus';

// Adding in Pharmacy
import PharmacyStatus from './pharmacyStatus/PharmacyStatus';


interface MedicationBundle {
    data: MedicationRequest[];
    reference: Patient;
}

function MedReqDropDown(props: any) {
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

    //CDSHooks
    const [cdsHook, setCDSHook] = useState<Hook | null>(null);

    //Cards
    const [hooksCards, setHooksCards] = useState<HooksCard[]>([]);

    //ETASU 
    const [showEtasu, setShowEtasu] = useState<boolean>(false);

    // Pharmacy
    const [showPharmacy, setShowPharmacy] = useState<boolean>(false);

    useEffect(() => {
        client.patient.read().then((patient: any) => setPatient(patient));
    }, [client.patient, client]);


    useEffect(() => {
        getMedicationRequest();
    }, []);

    //CDS-Hook Request to REMS-Admin for cards
    const SubmitToREMS = () => {
        axios({
            method: 'post',
            url: `${process.env.REACT_APP_REMS_ADMIN_SERVER_BASE}` + `${process.env.REACT_APP_REMS_HOOKS_PATH}`,
            data: cdsHook
        })
            .then((response) => {
                console.log(response.data.cards); // cards for REMS-333
                setHooksCards(response.data.cards);
            }, (error) => {
                console.log(error);
            });
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

    // MedicationRequest Prefectching Bundle
    const [medication, setMedication] = useState<MedicationBundle | null>(null);

    const getMedicationRequest = () => {
        client
            .request(`MedicationRequest?subject=Patient/${client.patient.id}`, {
                resolveReferences: ['subject', 'performer'],
                graph: false,
                flat: true,
            })
            .then((result: MedicationBundle) => {
                setMedication(result);
            });
    };

    const [selectedMedicationCardBundle, setselectedMedicationCardBundle] = useState<BundleEntry<MedicationRequest>>();

    const [selectedMedicationCard, setselectedMedicationCard] = useState<MedicationRequest>();

    useEffect(() => {
        if (selectedOption != '') {
            setselectedMedicationCard(medication?.data.find((medication) => medication.id === selectedOption));
        }
    }, [selectedOption]);

    useEffect(() => {
        if (selectedMedicationCard) {
            setselectedMedicationCardBundle({ resource: selectedMedicationCard });
        }
    }, [ selectedMedicationCard]);


    useEffect(() => {
        if (patient && patient.id && client.user.id && selectedMedicationCardBundle) {
            const hook = new OrderSign(patient.id, client.user.id, { resourceType: 'Bundle', type: 'batch', entry: [selectedMedicationCardBundle] });
            const tempHook = hook.generate();

            hydrate(getFhirResource, example.prefetch, tempHook).then(() => {
                setCDSHook(tempHook);
            });
        }
    }, [ selectedMedicationCardBundle]);

    const modal_style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        border: '1px solid #000',
        boxShadow: 24,
        p: 4,
    };

    const etasu_status_enabled: boolean = process.env.REACT_APP_ETASU_STATUS_ENABLED?.toLowerCase() === 'true' ? true : false;
    const pharmacy_status_enabled: boolean = process.env.REACT_APP_PHARMACY_STATUS_ENABLED?.toLowerCase() === 'true' ? true : false;

    return (
        <div>
            <Box sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <div className='MedReqDropDown'>
                    <div>
                        <Card sx={{ minWidth: 500, maxWidth: 5000, bgcolor: 'white', p: 5 }}>
                            <CardContent>
                                <Typography sx={{ fontSize: 17 }} color='text.secondary' gutterBottom component='div'>
                                    Select Medication Request:
                                </Typography>
                                <FormControl sx={{ minWidth: 300, mt: 1 }}>
                                    <InputLabel id='dropdown-label'>Select Medication</InputLabel>
                                    <Select
                                        labelId='dropdown-label'
                                        id='dropdown'
                                        value={selectedOption}
                                        onChange={handleOptionSelect}
                                    >
                                        <MenuItem value=''>
                                            <em>Select Medication</em>
                                        </MenuItem>
                                        {medication ?
                                            medication.data.map((medications) => (
                                                <MenuItem key={medications.id} value={medications.id}>
                                                    {medications.medicationCodeableConcept?.coding?.[0].display}
                                                </MenuItem>

                                            ))
                                            : <p>loading medications...</p>}
                                    </Select>
                                </FormControl>
                            </CardContent>
                            {selectedMedicationCard && (
                                <CardContent>
                                    <Typography sx={{ bgcolor: 'text.secondary', color: 'white', textAlign: 'center' }}>
                                        Code: {selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].code}
                                    </Typography>
                                    <Typography sx={{ bgcolor: 'text.disabled', color: 'white', textAlign: 'center', fontSize: 24 }}>
                                        {selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].display?.split(' ')[0]}
                                    </Typography>
                                    <Typography variant='h6' sx={{ bgcolor: 'text.disabled', color: 'white', textAlign: 'center' }} color='textSecondary' gutterBottom>
                                        {selectedMedicationCard?.medicationCodeableConcept?.coding?.[0].display}
                                    </Typography>
                                    {etasu_status_enabled && (
                                        <Button variant='contained' onClick={handleOpenCheckETASU}>Check ETASU</Button>
                                    )}
                                    {pharmacy_status_enabled && (
                                        <Button variant='contained' onClick={handleOpenCheckPharmacy}>Check Pharmacy</Button>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                        {selectedOption ?
                            <Card>
                                <CardContent>
                                    <CdsHooksCards cards={hooksCards} client={client}></CdsHooksCards>
                                </CardContent>
                            </Card>
                            : <p></p>}
                    </div>
                </div>
            </Box >
            <Modal
                open={showEtasu}
                onClose={handleCloseCheckETASU}
            >
                <Box sx={modal_style}>
                    <EtasuStatus patient={patient} medication={selectedMedicationCard} update={showEtasu}></EtasuStatus>
                </Box>
            </Modal>
            <Modal
                open={showPharmacy}
                onClose={handleCloseCheckPharmacy}
            >
                <Box sx={modal_style}>
                    <PharmacyStatus patient={patient} medication={selectedMedicationCard} update={showPharmacy}></PharmacyStatus>
                </Box>
            </Modal>
        </div>
    );
}

export default MedReqDropDown;
