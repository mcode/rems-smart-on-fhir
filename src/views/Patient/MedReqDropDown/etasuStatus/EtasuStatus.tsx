import { Tooltip, IconButton, Grid } from '@mui/material';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';

import { GuidanceResponse, Parameters, ParametersParameter } from 'fhir/r4';

import { useState, useEffect } from 'react';

import './EtasuStatus.css';
import { getStatus } from '../MedReqDropDown';

interface EtasuStatusProps {
  callback: () => void;
  remsAdminResponse: GuidanceResponse | null;
  update: boolean;
}
interface EtasuParam extends Parameters {
  parameter: EtasuParamParam[];
}
interface EtasuParamParam extends ParametersParameter {
  resource: GuidanceResponse;
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

  const getRequirements = () => {
    const output = props.remsAdminResponse?.outputParameters?.reference;
    if (output) {
      if (output.startsWith('#')) {
        // contained reference
        const reference = output.slice(1);
        if (props.remsAdminResponse?.contained) {
          const outputParams = props.remsAdminResponse.contained.find(containedResource => {
            return containedResource.id === reference;
          }) as EtasuParam;
          if (outputParams.parameter) {
            return outputParams.parameter;
          } else {
            console.log('unsupported etasu - no parameters found');
          }
        }
      } else {
        console.log('unsupported etasu - no contained reference');
      }
    } else {
      console.log('unsupported etasu - no output parameter reference');
    }
    return []; // do not return undefined
  };

  const status = getStatus(props.remsAdminResponse);

  return (
    <div>
      <h1>REMS Status</h1>
      <div className="status-icon" style={{ backgroundColor: status.color }}></div>
      <Grid container columns={12}>
        <Grid item xs={10}>
          <div className="bundle-entry">Status: {status.display || 'N/A'}</div>
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
              {getRequirements().map((param: EtasuParamParam) => {
                if (param.resource) {
                  return (
                    <ListItem disablePadding key={param.name} data-testid="etasu-item">
                      <ListItemIcon>
                        {param.resource?.status === 'success' ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Close color="warning" />
                        )}
                      </ListItemIcon>
                      {param.resource?.status === 'success' ? (
                        <ListItemText primary={param.name} />
                      ) : (
                        <ListItemText
                          primary={param.name}
                          secondary={param.resource?.note?.[0]?.text}
                        />
                      )}
                    </ListItem>
                  );
                }
              })}
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
