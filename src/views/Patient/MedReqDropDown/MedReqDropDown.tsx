import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import axios from 'axios';
import { useState } from 'react';
import './MedReqDropDown.css';

const REMS_ADMIN_SERVER_BASE = "http://localhost:8090";

interface Option {
    label: string;
    value: string;
}

interface CardData {
    id: string;
    title: string;
    display: string;
    code: string;
}

// TODO -> (REMS-367) Will need to remove this and populate the fields/list of medications from Test-EHR 
const menuOptions: Option[] = [
    { label: 'Isotretinoin 20 MG Oral Capsule', value: 'option1' },
    { label: 'TIRF 200 UG Oral Transmucosal Lozenge', value: 'option2' },
    { label: 'Turalio 200 MG Oral Capsule', value: 'option3' },
];

const cards: CardData[] = [
    { id: 'option1', title: 'Isotretinoin', display: '20 MG Oral Capsule', code: '6064' },
    { id: 'option2', title: 'TIRF', display: '200 UG Oral Transmucosal Lozenge', code: '1237051' },
    { id: 'option3', title: 'Turalio', display: '200 MG Oral Capsule', code: '2183126' },
];

function MedReqDropDown(props: any) {
    const { cdsHook } = props;

    const [selectedOption, setSelectedOption] = useState<string>('');

    const handleOptionSelect = (event: SelectChangeEvent<string>) => {
        setSelectedOption(event.target.value as string);
    };

    const selectedCard = cards.find((card) => card.id === selectedOption);

    //CDS-Hook Request to REMS-Admin for cards
    const buttonClickSubmitToREMS = () => {
        axios({
            method: 'post',
            url: `${REMS_ADMIN_SERVER_BASE}/cds-services/rems-order-sign`, // may change based on server endpoint
            data: cdsHook
        })
            .then((response) => {
                console.log(response.data); // cards for REMS-333
            }, (error) => {
                console.log(error)
            });
    };

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
                                    onChange={handleOptionSelect}
                                >
                                    <MenuItem value=''>
                                        <em>Select Medication</em>
                                    </MenuItem>
                                    {menuOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </CardContent>
                        {selectedCard && (
                            <CardContent>
                                <Typography sx={{ bgcolor: 'text.secondary', color: 'white', textAlign: 'center' }}>
                                    Code: {selectedCard.code}
                                </Typography>
                                <Typography sx={{ bgcolor: 'text.disabled', color: 'white', textAlign: 'center', fontSize: 24 }}>
                                    {selectedCard.title}
                                </Typography>
                                <Typography variant='h6' sx={{ bgcolor: 'text.disabled', color: 'white', textAlign: 'center' }} color='textSecondary' gutterBottom>
                                    {selectedCard.display}
                                </Typography>

                                <Button variant='contained' onClick={buttonClickSubmitToREMS}>Submit To REMS-Admin</Button>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </Box >
    );
}

export default MedReqDropDown;
