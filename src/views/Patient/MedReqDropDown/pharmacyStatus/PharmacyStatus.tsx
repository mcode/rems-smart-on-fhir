import { Tooltip, IconButton, Grid } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { MedicationRequest, Patient } from 'fhir/r4';

import axios from 'axios';
import { useState, useEffect } from 'react';

import './PharmacyStatus.css';
import DoctorOrder from './DoctorOrder';
import { getDrugCodeableConceptFromMedicationRequest } from '../../../Questionnaire/questionnaireUtil';
import * as env from 'env-var';

interface PharmacyStatusProps {
  callback: () => void;
  pimsResponse: DoctorOrder | null;
  update: boolean;
}

const PharmacyStatus = (props: PharmacyStatusProps) => {
  const [spin, setSpin] = useState<boolean>(false);
  useEffect(() => {
    if (props.update) {
      setSpin(true);
      props.callback();
    }
  }, [props.update]);

  const status = props.pimsResponse?.dispenseStatus;
  let color = '#f7f7f7'; // white
  if (status === 'Approved') {
    color = '#5cb85c'; // green
  } else if (status === 'Pending') {
    color = '#f0ad4e'; // orange
  } else if (status === 'Picked Up') {
    color = '#0275d8'; // blue
  }

  return (
    <div>
      <h1>Pharmacy Status</h1>
      <div className="status-icon" style={{ backgroundColor: color }}></div>
      <Grid container columns={12}>
        <Grid item xs={10}>
          <div className="bundle-entry">ID: {props.pimsResponse?._id || 'N/A'}</div>
          <div className="bundle-entry">Status: {props.pimsResponse?.dispenseStatus || 'N/A'}</div>
        </Grid>
        <Grid item xs={2}>
          <div className="bundle-entry">
            <Tooltip title="Refresh">
              <IconButton onClick={props.callback} data-testid="refresh">
                <AutorenewIcon
                  className={spin === true ? 'refresh' : 'renew-icon'}
                  onAnimationEnd={() => setSpin(false)}
                />
              </IconButton>
            </Tooltip>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

export default PharmacyStatus;
