import {
  Grid,
  Paper,
  Stack,
  Box,
  Typography
} from '@mui/material';
import { memo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Help.css';
const helpDict = [
  {
    name: 'REMS',
    definition:
      'An acronym standing for Risk Evaluation and Mitigation Strategies. A medication with a REMS program has restrictions surrounding its prescriptions to ensure safe use of the medication and minimize side effects.'
  },
  {
    name: 'Questionnaire',
    definition:
      'A FHIR Resource that contains a set of questions to be answered to determine if certain requirements and criteria are met.'
  },
  {
    name: 'ETASU',
    definition:
      'An acronym standing for Element To Assure Safe Use.  A REMS program will often have several ETASU, which are forms or actions that must be filled or taken before approval is given, to ensure that the risk of the medication is mitigated.'
  },
  {
    name: 'MCODE',
    definition:
      'An acronym standing for Minimal Common Oncology Data Elements.  It is an initiative intended to assemble a core set of structured data elements for oncology electronic health records.'
  },
  {
    name: 'REMS Administrator',
    definition:
      'The group or entity responsible for managing the REMS program of one or more medications.'
  },
  {
    name: 'Turalio',
    definition:
      'A REMS drug that treats tenosynovial giant cell tumor, but can cause severe liver complications.'
  },
  {
    name: 'Isotretinoin',
    definition:
      'A REMS drug, also known as Accutane, that treats acne.  It can cause severe birth defects.  It has a REMS program called iPLEDGE.'
  },
  {
    name: 'TIRF',
    definition:
      'Transmucosal Immediate-Release Fentanyl (TIRF) is a drug with a REMS program. Transmucosal fentanyl is a strong opioid agonist that is only approved for breakthrough cancer pain for patients receiving around-the-clock opioid therapy for persistent cancer pain.'
  }
];
const Help = () => {
  const [selected, setSelected] = useState<string>('');
  const { id } = useParams();

  useEffect(() => {
    document.title = 'Help page for SMART on FHIR REMS App';
  });

  const renderWords = () => {
    return (
      <>
        {helpDict.map(word => {
          return (
            <Stack
              onMouseOver={() => {
                setSelected(word.name);
              }}
              sx={{
                textAlign: 'left',
                padding: '10px',
                backgroundColor: 'antiquewhite',
                marginBottom: '10px'
              }}
            >
              <Typography variant={'h5'}>{word.name}</Typography>
              {selected === word.name ? (
                <Typography variant={'body1'}>{word.definition}</Typography>
              ) : (
                ''
              )}
            </Stack>
          );
        })}
      </>
    );
  };
  const renderWorkflowBox = (title: string, image: string) => {
    return (
      <Grid item xs={12}>
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              position: 'flex',
              width: 'inherit',
              backgroundColor: 'lightblue',
              padding: 2
            }}
          >
            <Typography variant="h4" sx={{ marginBottom: '10px' }}>
              {title}
            </Typography>
            <img src={image} alt="Example Image" style={{ width: '90%', height: '90%' }} />
          </Box>
        </Box>
      </Grid>
    );
  };
  const renderMainView = () => {
    if (id === 'form-help') {
      return (
        <Grid container>
          <Grid item xs={12} justifyContent={'center'} textAlign={'center'}>
            <Typography variant={'h2'} sx={{ padding: '20px' }}>
              Form Help
            </Typography>
          </Grid>
          <Grid container spacing={2} sx={{ padding: '20px' }}>
            {renderWorkflowBox(
              'Fill out form by answering questions presented.  Questions with a red asterisk are required and must be answered before submitting.',
              '/images/Workflow1_FormFill.png'
            )}
            {renderWorkflowBox(
              'Click the "Only Show Unfilled Fields" checkbox to filter out questions that have been already answered.',
              '/images/Workflow2_FormFill.png'
            )}
            {renderWorkflowBox(
              'Click "Load Previous Form" to load an in-progress form that has been previously saved. Click "Save to EHR" to save the form to be finished later. Click "Submit to REMS Bundle" to submit the form to the REMS Administrator',
              '/images/Workflow3_FormFill.png'
            )}
          </Grid>
        </Grid>
      );
    } else {
      return (
        <Grid container>
          <Grid item xs={12} justifyContent={'center'} textAlign={'center'}>
            <Typography variant={'h2'} sx={{ padding: '20px' }}>
              Help
            </Typography>
            <a
              style={{ fontSize: '18px', display: 'inline-block', marginBottom: '10px' }}
              href="#glossary"
            >
              Glossary
            </a>
          </Grid>
          <Grid container>
            <Grid item xs={12}>
              <Stack className="help-box" sx={{ width: '100%' }}>
                <Paper
                  component="header"
                  sx={{
                    p: '12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    borderRadius: '18px',
                    marginLeft: 'auto',
                    marginBottom: '10px'
                  }}
                >
                  <h2>Workflow</h2>
                </Paper>
                <Grid container spacing={2}>
                  {renderWorkflowBox(
                    'Step 1: Open medication request dropdown',
                    '/images/Workflow1_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 2: Select a medication request for the in-context patient',
                    '/images/Workflow2_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 3: Click one of the forms to launch a SMART app',
                    '/images/Workflow3_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 4: Fill out the Questionnaire form in the SMART app',
                    '/images/Workflow4_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 5: Click the "Submit REMS Bundle" button once finished filling out form',
                    '/images/Workflow5_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 6: Upon successful submission, click the "Home" button to return to the main view',
                    '/images/Workflow6_MainPage.png'
                  )}
                  {renderWorkflowBox(
                    'Step 7: Repeat steps 3-6 for any remaining forms',
                    '/images/Workflow7_MainPage.png'
                  )}
                </Grid>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack className="help-box">
                <Paper
                  component="header"
                  sx={{
                    p: '12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    borderRadius: '18px',
                    marginLeft: 'auto'
                  }}
                >
                  <h2>Glossary</h2>
                  <div id="glossary"></div>
                </Paper>
                <Stack sx={{ maxHeight: '500px', marginTop: '10px' }}>{renderWords()}</Stack>
              </Stack>
            </Grid>
          </Grid>
        </Grid>
      );
    }
  };
  return <div>{renderMainView()}</div>;
};

export default memo(Help);
