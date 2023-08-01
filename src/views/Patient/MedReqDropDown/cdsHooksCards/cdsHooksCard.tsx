import React, { useState, useEffect, ReactElement } from 'react';
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';

import axios from 'axios';
import Client from 'fhirclient/lib/Client';

import { Card as HooksCard, Link } from '../../../../cds-hooks/resources/HookTypes';
import { SmartApp } from '../../../Questionnaire/SmartApp';
import { AppContext, getAppContext } from '../../../Questionnaire/questionnaireUtil';

// TODO:
//  - create a css file for better style
//      - do not have the card span the entire width of the window
//  - support suggestions
//      - add links that run fhir commands back to the EHR FHIR server
//      - add unit tests
//  - look into using the fhir client directly instead of using axios

interface CdsHooksCardProps {
  card: HooksCard;
  client: Client;
  tabCallback: (n: ReactElement, m: string) => void;
}

const CdsHooksCard = (props: CdsHooksCardProps) => {
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    modifySmartLaunchURLs(props.card).then(updatedLinks => {
      setLinks(updatedLinks);
      console.log(
        'CdsHooksCard::useEffect: updated all of the smart links for: ' + props.card?.summary
      );
    });
  }, [props.card]);

  function retrieveLaunchContext(client: Client, link: Link) {
    const patientId = client?.patient?.id;
    const accessToken = client?.state?.tokenResponse?.access_token;
    const fhirBaseUrl = client?.state?.serverUrl;

    return new Promise<Link>((resolve, reject) => {
      const headers = accessToken
        ? {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        : {
            Accept: 'application/json'
          };
      const launchParameters = {
        patient: patientId,
        appContext: ''
      };

      if (link.appContext) {
        launchParameters.appContext = link.appContext;
      }

      // May change when the launch context creation endpoint becomes a standard endpoint for all EHR providers
      axios({
        method: 'post',
        url: `${fhirBaseUrl}/_services/smart/Launch`,
        headers,
        data: {
          launchUrl: link.url,
          parameters: launchParameters
        }
      })
        .then(result => {
          if (result.data && Object.prototype.hasOwnProperty.call(result.data, 'launch_id')) {
            let baseUrl = link.url.split('?')[0];
            if (baseUrl.indexOf('?') < 0) {
              baseUrl += '?';
            } else {
              baseUrl += '&';
            }
            baseUrl += `launch=${result.data.launch_id}`;
            baseUrl += `&iss=${fhirBaseUrl}`;
            link.url = baseUrl;
            console.log('CdsHooksCard::retrieveLaunchContext: resolved link for: ' + link.label);
            return resolve(link);
          }
          console.error(
            'FHIR server endpoint did not return a launch_id to launch the SMART app. See network calls to the Launch endpoint for more details'
          );
          return reject(link);
        })
        .catch(err => {
          console.error(
            'Cannot grab launch context from the FHIR server endpoint to launch the SMART app. See network calls to the Launch endpoint for more details',
            err
          );
          return reject(link);
        });
    });
  }

  const buttonClickAction = (link: Link) => {
    console.log('CdsHooksCard::buttonClickAction(' + link.type + '): ' + link.label);
    if (link.type === 'absolute') {
      console.log('    launch: ' + link.url);
      window.open(link.url, '_blank');
    } else if (link.type === 'smart') {
      console.log('    launch: ' + link.url.split('?')[0]);
      console.log(link);
      let appContext: AppContext = {};
      if (link.appContext) {
        appContext = getAppContext(link.appContext);
      }
      props.tabCallback(
        <SmartApp
          smartClient={props.client}
          standalone={false}
          appContext={appContext}
          patientId={props.client.getPatientId() || ''}
        ></SmartApp>,
        link.label
      );
    }
  };

  function modifySmartLaunchURLs(card: HooksCard) {
    return new Promise<Link[]>(resolve => {
      const promises: Promise<Link>[] = [];
      const outputLinks: Link[] = [];
      card?.links?.map((link: Link) => {
        if (link.type === 'smart') {
          promises.push(retrieveLaunchContext(props.client, link));
        } else if (link.type === 'absolute') {
          outputLinks.push(link);
        }
        return undefined;
      });

      Promise.all(promises).then(links => {
        links.map((link: Link) => {
          outputLinks.push(link);
          return undefined;
        });

        console.log(outputLinks);
        resolve(outputLinks);
      });
    });
  }

  return (
    <div>
      <Card variant="outlined">
        <React.Fragment>
          <CardContent>
            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
              Summary
            </Typography>
            <Typography variant="h5" component="div">
              {props.card?.summary}
            </Typography>
            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
              Details
            </Typography>
            <Typography variant="body2">{props.card?.detail}</Typography>
            <Typography sx={{ fontSize: 10 }} color="text.secondary" gutterBottom>
              Source <a href={props.card?.source?.url}>{props.card?.source?.label}</a>
            </Typography>
          </CardContent>
          <CardActions>
            {links.map((link: Link) => (
              <Button key={link?.label} size="small" onClick={() => buttonClickAction(link)}>
                {link?.label}
              </Button>
            ))}
          </CardActions>
        </React.Fragment>
      </Card>
    </div>
  );
};

export default CdsHooksCard;
