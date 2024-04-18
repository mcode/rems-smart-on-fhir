import { useState } from 'react';
import './RemsInterface.css';
import { FhirResource } from 'fhir/r4';

interface ResourceEntryProps {
  resource: FhirResource;
}
export default function ResourceEntry(props: ResourceEntryProps) {
  const [viewDetails, setViewDetails] = useState<boolean>(false);

  const toggleOpenDetails = () => {
    setViewDetails(!viewDetails);
  };
  return (
    <div>
      <div
        className={'resource-entry ' + [viewDetails ? 'active' : '']}
        onClick={toggleOpenDetails}
      >
        <div>{props.resource['resourceType']}</div>
      </div>
      {viewDetails && (
        <div className="details">
          <pre>{JSON.stringify(props.resource, null, '\t')}</pre>
        </div>
      )}
    </div>
  );
}
