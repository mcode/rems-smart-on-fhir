import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
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

    useEffect(() => {
        client.patient.read().then((patient: any) => setPatient(patient));
    }, [client.patient, client]);



    //CDS-Hook Request to REMS-Admin for cards
    const buttonClickSubmitToREMS = () => {
        axios({
            method: 'post',
            url: `${process.env.REACT_APP_REMS_ADMIN_SERVER_BASE}` +  `${process.env.REACT_APP_REMS_HOOKS_PATH}`,
            data: cdsHook
        })
            .then((response) => {
                console.log(response.data.cards); // cards for REMS-333
                setHooksCards(response.data.cards);
            }, (error) => {
                console.log(error);
            });
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

    const [selectedMedicationCardBundle, setselectedMedicationCardBundle] = useState<BundleEntry<MedicationRequest>>({});

    const [selectedMedicationCard, setselectedMedicationCard] = useState<MedicationRequest>();

    useEffect(() => {
        setselectedMedicationCard(medication?.data.find((medication) => medication.id === selectedOption));
    }, [selectedOption]);

    useEffect(() => {
        setselectedMedicationCardBundle({ resource: selectedMedicationCard });
    }, [selectedOption, selectedMedicationCard]);


    useEffect(() => {
        if (patient && patient.id && client.user.id) {
            const hook = new OrderSign(patient.id, client.user.id, { resourceType: 'Bundle', type: 'batch', entry: [selectedMedicationCardBundle] });
            const tempHook = hook.generate();

            hydrate(getFhirResource, example.prefetch, tempHook).then(() => {
                setCDSHook(tempHook);
            });
        }
    }, [patient, client, selectedMedicationCardBundle]);


    return (
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
                                New Medication Request:
                            </Typography>
                            <FormControl sx={{ minWidth: 300, mt: 1 }}>
                                <InputLabel id='dropdown-label'>Select Medication</InputLabel>
                                <Select
                                    labelId='dropdown-label'
                                    id='dropdown'
                                    value={selectedOption}
                                    // TODO: --> onOpen might not be the best used here since it needs to be called twice to correctly return values
                                    onOpen={getMedicationRequest}
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
                                <Button variant='contained' onClick={buttonClickSubmitToREMS}>Submit To REMS-Admin</Button>
                                <CdsHooksCards cards={hooksCards} client={client}></CdsHooksCards>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </Box >
    );
}

export default MedReqDropDown;