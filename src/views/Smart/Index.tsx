import React, { useState, useEffect } from 'react';
import FHIR from 'fhirclient';
import App from '../../App';
import Client from 'fhirclient/lib/Client';

const Index = () => {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    FHIR.oauth2.ready().then(client => {
      setClient(client);
    });
    document.title = 'REMS SMART on FHIR app';
  }, []);

  return (
    <div>
      {client ? (
        <App client={client} />
      ) : (
        <div className="loading">
          <h1>Getting Client...</h1>
        </div>
      )}
    </div>
  );
};

export default Index;
