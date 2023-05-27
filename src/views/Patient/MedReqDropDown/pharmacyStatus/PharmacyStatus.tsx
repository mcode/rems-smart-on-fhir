import { Tooltip, IconButton } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { MedicationRequest, Patient } from 'fhir/r4';

import axios from 'axios';
import { useState } from 'react';

import './PharmacyStatus.css';
import MetRequirements from '../etasuStatus/MetRequirements';


export interface DoctorOrder {
    _id: string,
    caseNumber: string,
    patientName: string,
    patientFirstName: string,
    patientLastName: string,
    patientDOB: string,
    patientCity: string,
    patientStateProvince: string,
    patientPostalCode: string,
    patientCountry: string,
    doctorName: string,
    doctorContact: string,
    doctorID: string,
    doctorEmail: string,
    drugNames: string,
    simpleDrugName: string,
    rxDate: string,
    drugPrice: number,
    drugNdcCode: string,
    quanitities: string,
    total: number,
    pickupDate: string,
    dispenseStatus: string,
    metRequirements: MetRequirements[]
}

//TODO: move this to an environment variable / configuration file
const PIMS_SERVER_BASE = 'http://localhost:5051';

interface PharmacyStatusProps {
    patient: Patient | null
    medication: MedicationRequest | undefined
}

function PharmacyStatus(props: PharmacyStatusProps) {

    const [spinPims, setSpinPims] = useState<boolean>(false);
    const [pimsResponse, setPimsResponse] = useState<DoctorOrder | null>(null);

    const refreshPharmacyBundle = () => {
        setSpinPims(true);
        const patientFirstName = props.patient?.name?.at(0)?.given?.at(0);
        const patientLastName = props.patient?.name?.at(0)?.family;
        const patientDOB = props.patient?.birthDate;
        const rxDate = props.medication?.authoredOn;
        const drugNames = props.medication?.medicationCodeableConcept?.coding?.at(0)?.display;
        console.log('refreshPharmacyBundle: ' + patientFirstName + ' ' + patientLastName + ' - ' + patientDOB + ' - ' + rxDate + ' - ' + drugNames);
        const ndcDrugCoding = props.medication?.medicationCodeableConcept?.coding?.find(({system}) => system === 'http://hl7.org/fhir/sid/ndc');
        let queryString: string = 'rxDate=' + rxDate + '&drugNames=' + drugNames;
        if (ndcDrugCoding != undefined) {
            queryString = queryString + '&drugNdcCode=' + ndcDrugCoding?.code;
        }
        queryString = encodeURIComponent(queryString);
        const url = `${PIMS_SERVER_BASE}/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?${queryString}`;
        console.log(url);
        axios({
            method: 'get',
            url: url
        })
        .then((response) => {
            console.log(response.data);
            setPimsResponse(response.data);
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
            <div className='container left-form'>
                    <h1>Pharmacy Status</h1>
                    <div className='status-icon' style={{ backgroundColor: color }}></div>
                    <div className='bundle-entry'>
                        ID : {pimsResponse?._id || 'N/A'}
                    </div>
                    <div className='bundle-entry'>
                        Status: {pimsResponse?.dispenseStatus}
                    </div>
                    <div className='bundle-entry'>
                        {//remsAdminResponse?.case_number ?
                        <Tooltip title='Refresh'>
                            <IconButton onClick={refreshPharmacyBundle}>
                                <AutorenewIcon
                                    className={spinPims === true ? 'refresh' : 'renew-icon'}
                                    onAnimationEnd={() => setSpinPims(false)}
                                />
                            </IconButton>
                        </Tooltip>
                        //: ''
                        }
                    </div>

            </div>

        </div>
    );
}

export default PharmacyStatus;