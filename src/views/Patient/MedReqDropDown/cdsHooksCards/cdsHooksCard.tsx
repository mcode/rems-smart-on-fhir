import React, { useState, useEffect, ReactElement } from 'react';
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';

import axios from 'axios';
import Client from 'fhirclient/lib/Client';

import { Card as HooksCard, Link } from '../../../../cds-hooks/resources/HookTypes';
import { SmartApp } from '../../../Questionnaire/SmartApp';
import { AppContext, getAppContext } from '../../../Questionnaire/questionnaireUtil';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

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
  name: string;
  tabIndex: number;
  setTabIndex: (n: number) => void;
  tabCallback: (n: ReactElement, m: string, o: string, l?: number) => void;
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
          tabIndex={props.tabIndex}
        ></SmartApp>,
        link.label,
        props.name,
        props.tabIndex
      );
      props.setTabIndex(props.tabIndex + 1);
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
  const cardSectionHeaderStyle = { marginBottom: '2px', color: 'black' };
  const decisionCard = { padding: '15px', margin: '10px', backgroundColor: '#fff', border: '1px solid rgba(0, 0, 0, 0.12)',
  borderRadius: '4px'};
  const cardSource = { fontSize: '.85rem', fontStyle: 'italic', margin: '0 0 5px'};
  const sourceLink = { marginRight: '8px', color: '#4183c4', textDecoration: 'none' };
  return (
    <div>
      <Card variant="outlined" style={decisionCard}>
        <React.Fragment>
          <CardContent>
            <Typography  style={cardSectionHeaderStyle} gutterBottom>
              Summary
            </Typography>
            <Typography variant="h5" component="div">
              <p>{props.card?.summary}</p>
            </Typography>
            <br/>
            <Typography  style={cardSectionHeaderStyle} gutterBottom>
              Details
            </Typography>
            <Typography>{props.card?.detail}</Typography>
            <br/>
            <Typography style={cardSource} gutterBottom>
              Source <a href={props.card?.source?.url} style={sourceLink}>{props.card?.source?.label}</a>
            </Typography>
          </CardContent>
          <CardActions sx={{display: 'inline !important'}}>
            {links.map((link: Link) => {
              if (link.type === 'smart') {
                return (<Button key={link?.label} variant="outlined" onClick={() => buttonClickAction(link)}>
                  {link?.label}
                </Button>);
              }
              return (
                <Button key={link?.label} endIcon={<PictureAsPdfIcon />} onClick={() => buttonClickAction(link)}>
                  {link?.label}
                </Button>
              );
            })}
          </CardActions>
        </React.Fragment>
      </Card>
    </div>
  );
};

export default CdsHooksCard;
