import { Tooltip, IconButton, Grid } from '@mui/material';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';

import { MedicationRequest, Patient } from 'fhir/r4';

import axios from 'axios';
import { useState, useEffect } from 'react';

import RemsMetEtasuResponse from './RemsMetEtasuResponse';
import MetRequirements from './MetRequirements';
import * as env from 'env-var';
import './EtasuStatus.css';

interface EtasuStatusProps {
  patient: Patient | null;
  medication: MedicationRequest | undefined;
  update: boolean;
}

const EtasuStatus = (props: EtasuStatusProps) => {
  const [spin, setSpin] = useState<boolean>(false);
  const [remsAdminResponse, setRemsAdminResponse] = useState<RemsMetEtasuResponse | null>(null);

  useEffect(() => {
    if (props.update) {
      refreshEtasuBundle();
    }
  }, [props.update]);

  const refreshEtasuBundle = () => {
    setSpin(true);
    const patientFirstName = props.patient?.name?.at(0)?.given?.at(0);
    const patientLastName = props.patient?.name?.at(0)?.family;
    const patientDOB = props.patient?.birthDate;
    const drugCode = props.medication?.medicationCodeableConcept?.coding?.at(0)?.code;
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
        console.log(response.data);
        setRemsAdminResponse(response.data);
      },
      error => {
        console.log(error);
      }
    );
  };

  const status = remsAdminResponse?.status;
  let color = '#f7f7f7'; // off-white
  if (status === 'Approved') {
    color = '#5cb85c'; // green
  } else if (status === 'Pending') {
    color = '#f0ad4e'; // orange
  }

  return (
    <div>
      <h1>REMS Status</h1>
      <div className="status-icon" style={{ backgroundColor: color }}></div>
      <Grid container columns={12}>
        <Grid item xs={10}>
          <div className="bundle-entry">Case Number: {remsAdminResponse?.case_number || 'N/A'}</div>
          <div className="bundle-entry">Status: {remsAdminResponse?.status || 'N/A'}</div>
        </Grid>
        <Grid item xs={2}>
          <div className="bundle-entry">
            <Tooltip title="Refresh">
              <IconButton onClick={refreshEtasuBundle} data-testid="refresh">
                <AutorenewIcon
                  data-testid="icon"
                  className={spin === true ? 'refresh' : 'renew-icon'}
                  onAnimationEnd={() => setSpin(false)}
                />
              </IconButton>
            </Tooltip>
          </div>
        </Grid>
      </Grid>
      <div>
        <br></br>
        <h3>ETASU</h3>
        <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
          {remsAdminResponse ? (
            <List>
              {remsAdminResponse?.metRequirements.map((metRequirements: MetRequirements) => (
                <ListItem
                  disablePadding
                  key={metRequirements.metRequirementId}
                  data-testid="etasu-item"
                >
                  <ListItemIcon>
                    {metRequirements.completed ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Close color="warning" />
                    )}
                  </ListItemIcon>
                  {metRequirements.completed ? (
                    <ListItemText primary={metRequirements.requirementName} />
                  ) : (
                    <ListItemText
                      primary={metRequirements.requirementName}
                      secondary={metRequirements.requirementDescription}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            'Not Available'
          )}
        </Box>
      </div>
    </div>
  );
};

export default EtasuStatus;
