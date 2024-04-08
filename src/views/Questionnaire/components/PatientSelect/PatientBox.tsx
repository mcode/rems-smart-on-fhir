import React, { useState } from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import './PatientStyles.css';
import { QuestionnaireResponse } from 'fhir/r4';

interface PatientBoxProps {
  responses: QuestionnaireResponse[];
  callback: (n: string, m: QuestionnaireResponse) => void;
  patient: string;
}

export default function PatientBox(props: PatientBoxProps) {
  const [responseId, setResponseId] = useState<string>('');

  const updateValues = (patient: string, responseId: string) => {
    const response = props.responses.find(response => {
      return response.id === responseId;
    });

    const patientId = patient.split('/')[1];
    console.log(patientId);
    if (response) {
      props.callback(patientId, response);
    }
  };

  const handleChange = (e: SelectChangeEvent) => {
    setResponseId(e.target.value);
  };
  const patient = props.patient;

  return (
    <div>
      <div className="patient-selection-box" key={patient}>
        <div className="patient-info">
          <span style={{ fontWeight: 'bold' }}>ID</span>: {patient}
        </div>
        <FormControl className="request-info">
          <InputLabel id="Questionnaire">Questionnaire:</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={responseId}
            onChange={handleChange}
          >
            {props.responses.map(response => {
              return (
                <MenuItem key={response.id} value={response.id}>{`${response.questionnaire} - ${
                  response.authored ? new Date(response.authored).toDateString() : 'Unknown'
                }`}</MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <div>
          <button
            onClick={() => {
              updateValues(patient, responseId);
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
