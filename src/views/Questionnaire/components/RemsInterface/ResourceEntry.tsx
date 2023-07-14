import React, { useState } from 'react';
import './RemsInterface.css';
import { FhirResource } from 'fhir/r4';

interface ResourceEntryProps {
  resource: FhirResource;
}
export default function ResourceEntry(props: ResourceEntryProps) {
  const [viewDetails, setViewDetails] = useState<boolean>(false);

  const openDetails = () => {
    setViewDetails(!viewDetails);
  };
  return (
    <div>
      <div className={'resource-entry ' + [viewDetails ? 'active' : '']} onClick={openDetails}>
        <div>{props.resource['resourceType']}</div>
      </div>
      {viewDetails ? (
        <div className="details">
          <pre>{JSON.stringify(props.resource, null, '\t')}</pre>
        </div>
      ) : null}
    </div>
  );
}
