import { Button, Tooltip, IconButton } from '@mui/material';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircle  from '@mui/icons-material/CheckCircle';
import Close  from '@mui/icons-material/Close';

import { MedicationRequest, Patient } from 'fhir/r4';

import axios from 'axios';
import { useState } from 'react';

import MetRequirements from './MetRequirements';
import './EtasuStatus.css';


export interface RemsMetEtasuResponse {
    case_number: string,
    drugCode: string,
    drugName: string,
    patientFirstname: string,
    patientLastName: string,
    patientDOB: string,
    status: string,
    metRequirements: MetRequirements[]
}

//TODO: move this to an environment variable / configuration file
const REMS_ADMIN_SERVER_BASE = 'http://localhost:8090';

interface EtasuStatusProps {
    patient: Patient | null
    medication: MedicationRequest | undefined
}

function EtasuStatus(props: EtasuStatusProps) {

    const [spin, setSpin] = useState<boolean>(false);
    const [viewEtasu, setViewEtasu] = useState<boolean>(false);
    const [remsAdminResponse, setRemsAdminResponse] = useState<RemsMetEtasuResponse | null>(null);


    const toggleViewEtasu = () => {
        if (viewEtasu == true) {
            setViewEtasu(false);
        } else {
            setViewEtasu(true);
        }
    };

    const refreshEtasuBundle = () => {
        setSpin(true);
        const patientFirstName = props.patient?.name?.at(0)?.given?.at(0);
        const patientLastName = props.patient?.name?.at(0)?.family;
        const patientDOB = props.patient?.birthDate;
        const drugCode = props.medication?.medicationCodeableConcept?.coding?.at(0)?.code;
        console.log('refreshEtasuBundle: ' + patientFirstName + ' ' + patientLastName + ' - ' + patientDOB + ' - ' + drugCode);
        axios({
            method: 'get',
            url: `${REMS_ADMIN_SERVER_BASE}/etasu/met/patient/${patientFirstName}/${patientLastName}/${patientDOB}/drugCode/${drugCode}`
        })
        .then((response) => {
            console.log(response.data);
            setRemsAdminResponse(response.data);
        }, (error) => {
            console.log(error);
        });
    };

    //TODO: update this section
    //const status = this.state.remsAdminResponse?.data?.status;
    let color = '#f7f7f7';
    if (status === 'Approved') {
        color = '#5cb85c';
    } else if (status === 'Pending') {
        color = '#f0ad4e';
    }

    return (
        <div>
            <div>

                <div className='container left-form'>
                        <h1>REMS Status</h1>
                        <div className='status-icon' style={{ backgroundColor: color }}></div>
                        <div className='bundle-entry'>
                            Case Number : {remsAdminResponse?.case_number || 'N/A'}
                        </div>
                        <div className='bundle-entry'>
                            Status: {remsAdminResponse?.status}
                        </div>
                        <div className='bundle-entry'>
                            <Button variant='contained' onClick={toggleViewEtasu}>View ETASU</Button>
                            <Tooltip title='Refresh'>
                                <IconButton onClick={refreshEtasuBundle}>
                                    <AutorenewIcon
                                        className={spin === true ? 'refresh' : 'renew-icon'}
                                        onAnimationEnd={() => setSpin(false)}
                                    />
                                </IconButton>
                            </Tooltip>
                        </div>

                        {viewEtasu ?
                        <div className='bundle-view'>
                            <br></br>
                            <h3>ETASU</h3>
                            <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                                { remsAdminResponse && (
                                <List>
                                    {remsAdminResponse?.metRequirements.map((metRequirements: MetRequirements) => 
                                        <ListItem disablePadding key={metRequirements.metRequirementId}>
                                            <ListItemIcon>
                                                {metRequirements.completed ? 
                                                    <CheckCircle color='success' /> 
                                                    : 
                                                    <Close color='warning' />
                                                }
                                            </ListItemIcon>
                                            {metRequirements.completed ? 
                                                <ListItemText
                                                    primary={metRequirements.requirementName}
                                                    />
                                                : 
                                                <ListItemText
                                                    primary={metRequirements.requirementName}
                                                    secondary={metRequirements.requirementDescription}
                                                    />
                                            }
                                        </ListItem>
                                    )}
                                </List> 
                                )}
                            </Box>
                        </div>
                        :
                        ''}
                </div>

            </div>
        </div>
    );
}

export default EtasuStatus;