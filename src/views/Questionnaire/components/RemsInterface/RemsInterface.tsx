import { useState } from 'react';
import ResourceEntry from './ResourceEntry';
import './RemsInterface.css';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import { Bundle } from 'fhir/r4';
import { Box } from '@mui/material';
import { AxiosResponse } from 'axios';

interface RemsInterfaceProps {
  specialtyRxBundle: Bundle;
}
export interface RemsAdminResponse extends AxiosResponse {
  data: JsonData;
}

type MetRequirements = {
  completed: boolean;
  requirementName: string;
  requirementDescription: string;
};

interface JsonData {
  case_number: string;
  status: string;
  metRequirements: MetRequirements[];
}

export default function RemsInterface(props: RemsInterfaceProps) {
  const [viewBundle, setViewBundle] = useState<boolean>(false);

  const toggleBundle = () => {
    setViewBundle(!viewBundle);
  };

  const renderBundle = (bundle: Bundle) => {
    return bundle.entry?.map((entry, index) => {
      const resource = entry.resource;
      if (resource) {
        return <ResourceEntry resource={resource} key={`resource-${index}`} />;
      }
    });
  };

  return (
    <Box sx={{ p: 5 }}>
      <h1>Document Status</h1>
      <Paper style={{ paddingBottom: '5px' }}>
        <div className="status-icon" style={{ backgroundColor: '#5cb85c' }}></div>
        <div className="bundle-entry">Status: Documents successfully submitted</div>
        <div className="bundle-entry">
          <Button variant="contained" onClick={toggleBundle}>
            View Bundle
          </Button>
        </div>
      </Paper>
      {viewBundle && (
        <div className="bundle-view">
          <br></br>
          <h3>Bundle</h3>
          {renderBundle(props.specialtyRxBundle)}
        </div>
      )}
    </Box>
  );
}
