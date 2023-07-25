import { Tooltip, IconButton, Grid } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { MedicationRequest, Patient } from 'fhir/r4';

import axios from 'axios';
import { useState, useEffect } from 'react';

import './PharmacyStatus.css';
import DoctorOrder from './DoctorOrder';
import * as env from 'env-var';

interface PharmacyStatusProps {
  patient: Patient | null;
  medication: MedicationRequest | undefined;
  update: boolean;
}

const PharmacyStatus = (props: PharmacyStatusProps) => {
  const [spin, setSpin] = useState<boolean>(false);
  const [pimsResponse, setPimsResponse] = useState<DoctorOrder | null>(null);

  useEffect(() => {
    if (props.update) {
      refreshPharmacyBundle();
    }
  }, [props.update]);

  const refreshPharmacyBundle = () => {
    setSpin(true);
    const patientFirstName = props.patient?.name?.at(0)?.given?.at(0);
    const patientLastName = props.patient?.name?.at(0)?.family;
    const patientDOB = props.patient?.birthDate;
    const rxDate = props.medication?.authoredOn;
    const drugNames = props.medication?.medicationCodeableConcept?.coding?.at(0)?.display;
    console.log(
      'refreshPharmacyBundle: ' +
        patientFirstName +
        ' ' +
        patientLastName +
        ' - ' +
        patientDOB +
        ' - ' +
        rxDate +
        ' - ' +
        drugNames
    );
    const ndcDrugCoding = props.medication?.medicationCodeableConcept?.coding?.find(
      ({ system }) => system === 'http://hl7.org/fhir/sid/ndc'
    );
    let queryString: string =
      'rxDate=' + rxDate + '&drugNames=' + encodeURIComponent(drugNames || '');
    if (ndcDrugCoding != undefined) {
      queryString = queryString + '&drugNdcCode=' + ndcDrugCoding?.code;
    }
    const pharmacyUrl = `${env.get('REACT_APP_PHARMACY_SERVER_BASE').asString()}/doctorOrders/api/getRx/${patientFirstName}/${patientLastName}/${patientDOB}?${queryString}`;
    console.log(pharmacyUrl);
    axios({
      method: 'get',
      url: pharmacyUrl
    }).then(
      response => {
        setPimsResponse(response.data);
      },
      error => {
        console.log(error);
      }
    );
  };

  const status = pimsResponse?.dispenseStatus;
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
          <div className="bundle-entry">ID: {pimsResponse?._id || 'N/A'}</div>
          <div className="bundle-entry">Status: {pimsResponse?.dispenseStatus || 'N/A'}</div>
        </Grid>
        <Grid item xs={2}>
          <div className="bundle-entry">
            <Tooltip title="Refresh">
              <IconButton onClick={refreshPharmacyBundle} data-testid="refresh">
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
