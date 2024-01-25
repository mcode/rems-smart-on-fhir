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
import { getDrugCodeFromMedicationRequest } from '../../../Questionnaire/questionnaireUtil';

interface EtasuStatusProps {
  callback: () => void;
  remsAdminResponse: RemsMetEtasuResponse | null;
  update: boolean;
}

const EtasuStatus = (props: EtasuStatusProps) => {
  const [spin, setSpin] = useState<boolean>(false);

  const updateEtasu = () => {
    setSpin(true);
    props.callback();
  };

  useEffect(() => {
    if (props.update) {
      updateEtasu();
    }
  }, [props.update]);

  const status = props.remsAdminResponse?.status;
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
          <div className="bundle-entry">
            Case Number: {props.remsAdminResponse?.case_number || 'N/A'}
          </div>
          <div className="bundle-entry">Status: {props.remsAdminResponse?.status || 'N/A'}</div>
        </Grid>
        <Grid item xs={2}>
          <div className="bundle-entry">
            <Tooltip title="Refresh">
              <IconButton onClick={updateEtasu} data-testid="refresh">
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
          {props.remsAdminResponse ? (
            <List>
              {props.remsAdminResponse?.metRequirements.map((metRequirements: MetRequirements) => (
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
