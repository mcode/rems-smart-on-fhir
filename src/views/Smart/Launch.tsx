import React, { memo, useState, useEffect } from 'react';
import FHIR from 'fhirclient';
import env from 'env-var';
import Register from './Register';
interface Client {
  name: string;
  client: string;
}
const Launch = () => {
  const [content, setContent] = useState(<div className='loading'><h1>Launching...</h1></div>);
  useEffect(() => {
    smartLaunch();
  }, []);

  const smartLaunch = () => {
    let clients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]');
    if (clients.length === 0) {
      const defaultClient = env.get('REACT_APP_DEFAULT_CLIENT_ID').asString();
      const defaultIss = env.get('REACT_APP_DEFAULT_ISS').asString();
      if (defaultClient && defaultIss) {
        clients = [{ client: defaultClient, name: defaultIss }];
        localStorage.setItem('clients', JSON.stringify(clients));
      }
    }
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
