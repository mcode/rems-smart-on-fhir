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
  }, []);

  return <div>{client ? <App client={client} /> : 'Getting Client'}</div>;
};

export default Index;
