import React, { memo, useState, useEffect } from 'react';
import FHIR from 'fhirclient';
import env from 'env-var';
import Register from './Register';
interface Client {
  name: string;
  client: string;
}
const Launch = () => {
  const [content, setContent] = useState(<p> Launching </p>);
  useEffect(() => {
    smartLaunch();
  }, []);

  const smartLaunch = () => {
    const clients: Client[] = JSON.parse(localStorage.getItem('clients') || '{}');
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const iss = params.get('iss');
    if (iss) {
      const storedClient = clients.find(e => {
        return e.name == iss;
      });

      if (storedClient) {
        // found matching iss
        const clientId = storedClient.client;
        FHIR.oauth2
          .authorize({
            clientId: clientId,
            scope: env.get('REACT_APP_CLIENT_SCOPES').asString(),
            redirectUri: '/index'
          })
          .catch(e => {
            console.log(e);
          });
      } else {
        setContent(<Register callback={smartLaunch} fhirUrl={iss} />);
      }
    } else {
      setContent(<div>iss not found</div>);
    }
  };

  return <div>{content}</div>;
};

export default memo(Launch);
