import { Tooltip, IconButton, Grid } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { BundleEntry, MedicationDispense } from 'fhir/r4';

import { useState, useEffect } from 'react';

import './PharmacyStatus.css';

interface PharmacyStatusProps {
  callback: () => void;
  testEhrResponse: BundleEntry<MedicationDispense> | null;
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

  const status = props.testEhrResponse?.resource?.status;
  let color = '#0c0c0c'; // black
  if (status === 'completed') {
    color = '#5cb85c'; // green
  }

  return (
    <div>
      <h1>Pharmacy Status</h1>
      <div className="status-icon" style={{ backgroundColor: color }}></div>
      <Grid container columns={12}>
        <Grid item xs={10}>
          <div className="bundle-entry">ID: {props.testEhrResponse?.resource?.id|| 'N/A'}</div>
          <div className="bundle-entry">Status: {props.testEhrResponse?.resource?.status || 'N/A'}</div>
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
