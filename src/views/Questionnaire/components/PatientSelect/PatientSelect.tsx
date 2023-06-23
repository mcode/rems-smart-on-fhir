import React, { Component, useEffect, useState } from "react";
import PatientBox from './PatientBox';
import Dialog from '@mui/material/Dialog';
import InfoIcon from '@mui/icons-material/Info'
import './PatientStyles.css';
import { QuestionnaireResponse } from "fhir/r4";
import Client from "fhirclient/lib/Client";

interface PatientSelectProps {
    smart: Client
    callback: (n: string, m: QuestionnaireResponse) => void

}

interface ResponseList {
    [key: string]: QuestionnaireResponse[]
}
export default function PatientSelect(props: PatientSelectProps){
    const [open, setOpen] = useState<boolean>(false)
    const [responseList, setResponseList] = useState<ResponseList>({})
    useEffect(() => {
        // we find it in reverse since
        // we're less likely to have qResponses
        const patientList: ResponseList = {};
        props.smart
            .request("QuestionnaireResponse?status=in-progress", { flat: true })
            .then((result: QuestionnaireResponse[]) => {
                result.forEach((response) => {
                    if( response.subject && response.subject.reference) {
                        // check if the patient already has an entry
                        if (patientList[response.subject.reference]) {
                            // we don't need the actual patient resource until the user
                            // chooses a patient, unless we want to show demographic data
                            patientList[response.subject.reference].push(response);
                        } else {
                            patientList[response.subject.reference] = [response];
                        }
                    }
                })
                setResponseList(patientList)
        })
    }, [])

    return (<div>
        <div className="patient-header">
            Select Patient and in-progress Questionnaire
            <InfoIcon onClick={()=>{setOpen(true)}}></InfoIcon>
            <Dialog onClose={()=>{setOpen(false)}} classes={{paper: 'info-padding'}} open={open}>
                <div>Info</div>
                <hr />
                <div>The standalone launch for DTR skips the CRD workflow and 
                    provides access to the EHR without a selected questionnaire or patient.
                    Patients with in-progress questionnaires can be selected from the dropdown 
                    below to continue with the DTR process.  Patients in the list only appear
                    if they have an outstanding in-progress questionnaire.  Use the dropdown in the patient
                    box to select a questionnaire, and then select the patient to continue the DTR workflow.  
                    If no patients appear in the box, there are no outstanding questionnaires to be continued.
                </div>
            </Dialog>
        </div>
        <div className="patient-box">

            {Object.keys(responseList).map((patient) => {
                return <div 
                key={patient}>
                    {<PatientBox
                        patient={patient} 
                        responses={responseList[patient]}
                        callback={props.callback} />}
                </div>
            })}
        </div>
    </div>)
}