import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { ReactElement, useEffect, useState } from 'react';

import axios from 'axios';
import Client from 'fhirclient/lib/Client';

import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import {
  Action,
  Card as HooksCard,
  Link,
  Suggestion
} from '../../../../cds-hooks/resources/HookTypes';
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
  name: string;
  tabIndex: number;
  setTabIndex: (n: number) => void;
  tabCallback: (n: ReactElement, m: string, o: string, l?: number) => void;
  cardInd: number;
  selectionBehavior: string | undefined;
}

export const CdsHooksCard = (props: CdsHooksCardProps) => {
  const [links, setLinks] = useState<Link[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    modifySmartLaunchURLs(props.card).then(updatedLinks => {
      setLinks(updatedLinks);
      console.log(
        'CdsHooksCard::useEffect: updated all of the smart links for: ' + props.card?.summary
      );
    });
    if (props?.card?.suggestions) {
      setSuggestions(props.card?.suggestions);
    }
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

  const buttonClickSuggestion = (
    suggestion: Suggestion,
    buttonId: string,
    suggestionCount: number,
    cardNum: number,
    selectionBehavior: string | undefined
  ) => {
    console.log('CdsHooksCard::buttonClickSuggestion: ' + suggestion.label);

    if (selectionBehavior === 'at-most-one') {
      // disable all suggestion buttons for this card
      for (let i = 0; i < suggestionCount; i++) {
        const bId = 'suggestion_button-' + cardNum + '-' + i;
        if (bId) {
          document.getElementById(bId)?.setAttribute('disabled', 'true');
        }
      }
    } else {
      // disable this suggestion button if any are allowed
      const element = document.getElementById(buttonId);
      element?.setAttribute('disabled', 'true');
      element?.setAttribute('style', 'background-color:#4BB543;');
    }

    let uri = '';
    suggestion?.actions?.forEach((action: Action) => {
      if (action.type.toUpperCase() === 'DELETE') {
        uri = action.resource.resourceType + '/' + action.resource.id;
        console.log('completing suggested action DELETE: ' + uri);
        props.client.delete(uri).then(result => {
          console.log('suggested action DELETE result:');
          console.log(result);
        });
      } else if (action.type.toUpperCase() === 'CREATE') {
        uri = action.resource.resourceType;
        console.log('completing suggested action CREATE: ' + uri);

        props.client
          .request({
            url: action.resource.resourceType,
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify(action.resource)
          })
          .then(result => {
            console.log('suggested action CREATE result:');
            console.log(result);
          });
      } else if (action.type.toUpperCase() === 'UPDATE') {
        uri = action.resource.resourceType + '/' + action.resource.id;
        console.log('completing suggested action UPDATE: ' + uri);
        props.client
          .request({
            url: action.resource.resourceType + '/' + action.resource.id,
            method: 'PUT',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify(action.resource)
          })
          .then(result => {
            console.log('suggested action UPDATE result:');
            console.log(result);
          });
      } else {
        console.log('WARNING: unknown action: ' + action.type);
      }
    });
  };

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

  const decisionCard = {
    backgroundColor: '#fff',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: '4px'
  };

  const cardSource = { fontSize: '.85rem', fontStyle: 'italic', margin: '0 0 5px' };
  const sourceLink = { marginRight: '8px', color: '#4183c4', textDecoration: 'none' };

  return (
    <Card
      variant="outlined"
      style={decisionCard}
      sx={{ margin: '0 auto 0', marginTop: '20px', maxWidth: '560px' }}
    >
      <Box sx={{ margin: '0 auto 0', width: '90%' }}>
        <CardContent>
          <Typography variant="h5" component="div">
            {props.card?.summary}
          </Typography>
        </CardContent>

        {/* Forms */}
        {links.filter(link => link.type === 'smart').length > 0 ? (
          <div>
            <Typography color="text.secondary">Required Forms</Typography>
            <List>
              {links.map((link: Link) => {
                if (link.type === 'smart') {
                  return (
                    <ListItem key={link?.label}>
                      <Button
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                          width: '100%',
                          marginBottom: '5px'
                        }}
                        variant="outlined"
                        onClick={() => buttonClickAction(link)}
                        endIcon={<ArrowForwardIosRoundedIcon />}
                      >
                        {link?.label}
                      </Button>
                    </ListItem>
                  );
                }
              })}
            </List>
          </div>
        ) : (
          <></>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 ? (
          <div>
            <Typography sx={{ marginTop: '10px' }} color="text.secondary">
              Suggestions
            </Typography>
            <List>
              {suggestions.map((suggestion: Suggestion, ind) => {
                const buttonId = 'suggestion_button-' + props.cardInd + '-' + ind;
                return (
                  <ListItem key={suggestion?.label}>
                    <Button
                      variant="contained"
                      endIcon={<AddCircleOutlineRoundedIcon />}
                      onClick={() =>
                        buttonClickSuggestion(
                          suggestion,
                          buttonId,
                          suggestions.length,
                          props.cardInd,
                          props.selectionBehavior
                        )
                      }
                      id={buttonId}
                    >
                      {suggestion?.label}
                    </Button>
                  </ListItem>
                );
              })}
            </List>
          </div>
        ) : (
          <></>
        )}

        {/* Documentation and Guides */}
        {links.filter(link => link.type === 'absolute').length > 0 ? (
          <Accordion
            sx={{ display: 'block', marginTop: '10px', width: '100%', backgroundColor: '#F3F6F9' }}
          >
            <AccordionSummary expandIcon={<KeyboardArrowDownRoundedIcon />}>
              <Typography sx={{ fontSize: 14 }} color="text.secondary">
                View documentation and guides
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {links.map((link: Link) => {
                if (link.type === 'absolute') {
                  return (
                    <Grid item key={link?.label}>
                      <Button
                        endIcon={<PictureAsPdfIcon />}
                        onClick={() => buttonClickAction(link)}
                      >
                        {link?.label}
                      </Button>
                    </Grid>
                  );
                }
              })}
            </AccordionDetails>
          </Accordion>
        ) : (
          <></>
        )}

        <Box sx={{ textAlign: 'right', paddingTop: '10px' }}>
          <Typography style={cardSource}>
            {'Source '}
            <a href={props.card?.source?.url} style={sourceLink}>
              {props.card?.source?.label}
            </a>
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};
