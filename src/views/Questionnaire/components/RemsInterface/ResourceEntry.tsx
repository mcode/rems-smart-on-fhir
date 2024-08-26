import { useState } from 'react';
import './RemsInterface.css';
import { FhirResource } from 'fhir/r4';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';

interface ResourceEntryProps {
  resource: FhirResource;
  key: string;
}
export default function ResourceEntry(props: ResourceEntryProps) {
  const [viewDetails, setViewDetails] = useState<boolean>(false);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const space = isXs ? '  ' : '\t';

  const toggleOpenDetails = () => {
    setViewDetails(!viewDetails);
  };
  return (
    <div key={props.key}>
      <div
        className={'resource-entry ' + [viewDetails ? 'active' : '']}
        onClick={toggleOpenDetails}
      >
        <div>{props.resource['resourceType']}</div>
      </div>
      {viewDetails && (
        <Box sx={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', p: 2 }} className="details">
          <Typography component="p" fontFamily="Monospace" sx={{ fontSize: { xs: 10, sm: 14 } }}>
            {JSON.stringify(props.resource, null, space)}
          </Typography>
        </Box>
      )}
    </div>
  );
}
