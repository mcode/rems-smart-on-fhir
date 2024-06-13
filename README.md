# Description

The [REMS](https://www.fda.gov/drugs/drug-safety-and-availability/risk-evaluation-and-mitigation-strategies-rems) [SMART on FHIR](https://docs.smarthealthit.org/) application is a multipurpose app that handles sending [CDS Hooks](https://cds-hooks.org/), filling out Questionnaire forms, and submitting REMS bundles for approval. This app fulfills the data gathering and submission portion of the REMS authorization workflow, allowing users to find and fill out forms required for prescribing and dispensing REMS medications. It adheres to the [DaVinci DTR Implementation Guide](https://build.fhir.org/ig/HL7/davinci-dtr/) standards for discovering, gathering, prepopulating, and opening forms.

# Getting Started with REMS SMART on FHIR

To get started, first clone the repository using a method that is most convenient for you.  If using HTTPS, run the following command:

`git clone https://github.com/mcode/rems-smart-on-fhir.git`

The following technologies must be installed on your computer to continue:
* [NPM](https://www.npmjs.com/)
* [Node](https://nodejs.org/en)

## Initialization

After cloning the repository, the submodules must be initialized. Run the following command:

### `git submodule update --init`

Next, install the required dependencies by running the following:

### `npm install`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:4040](http://localhost:4040) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://create-react-app.dev/docs/running-tests/) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [building and deploying](https://vitejs.dev/guide/build) for more information.


## Usage

The REMS SMART on FHIR app interacts with the [REMS Admin](https://github.com/mcode/rems-admin), an [EHR](https://github.com/mcode/test-ehr), and the [Pharmacy Information Management System](https://github.com/mcode/pims).  These apps are provided as part of the REMS ecosystem, but any individual part may be swapped out for something custom.  The EHR in particular can be easily switched by launching the SMART app from a different EHR.  Launching the app can be easily done through the [Request Generator](https://github.com/mcode/request-generator), a front end app for EHRs that sends and receives CDS Hooks.  The SMART app must be launched through an EHR or through the Request Generator.

Typically, a CDS Hook will be sent from the EHR to the REMS Admin, which will respond with cards that contain information about next steps. These cards may contain a link to a SMART app. Clicking on these links will launch the SMART app automatically. 

The SMART app can also be launched manually from the Request Generator for convenience by clicking a button.  

Once launched, the SMART app will open a Questionnaire form, prepopulate any answers it can using the patient's health record, and then allow the user to manually input answers to any remaining questions. Once all required fields are filled, the form can be submitted back to the REMS Admin for approval. 

## Routes

The REMS SMART on FHIR app handles four routes:

* `launch` - The launch page, used to fulfill SMART on FHIR standard launch handshake. It contains no front-facing components.
* `index` - The index page is the second step of the SMART on FHIR standard launch handshake. It renders the main content.
* `register` - The register page allows the user to save client ids for launching the app. If using an EHR with a client id other than the default, or if trying to connect to multiple different EHRs, the register page can help manage client ids.
* `help` - The help page provides a glossary and a visual guide to using the app.

Typically, users will click on a link which opens the `launch` page, which automatically kicks off the process of launching and opening the `index` page. Users must manually visit the `register` and `help` pages if needed.

## Environment Variables

The .env file contains the default URI paths, which can be overwritten from the start command as follows:
a) `REACT_APP_LAUNCH_URL=http://example.com PORT=6000 npm start` or b) by specifying the environment variables and desired values in a `.env.local`.

Following are a list of modifiable paths:

| URI Name                          | Default Value                                                                         | Description                                     |
| --------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| GENERATE_SOURCEMAP                | `false`                                                                               | Set to 'true' to generate a sourcemap.  A sourcemap allows the browser to reference untranspiled code.  This is useful for debugging and developing, but should not be used in production.                                                  |
| PORT                              | `4040`                                                                                | Which port to run the app on. Generally, there shouldn't be a reason to change the port for normal development work unless there is a conflict with another app already using the port.                                       |
| REACT_APP_CLIENT_SCOPES           | `launch openid profile user/Patient.read patient/Patient.read user/Practitioner.read` | When logging into the EHR, the scopes listed will be included in the request for an access token. Only resources listed in the scope can be requested by the SMART app.  Adding additional resources to the scope may result in being denied an access token.                                                  |
| REACT_APP_DEFAULT_CLIENT_ID       | `app-login`                                                                           | When logging into the EHR, the app will use the provided client id in the request for an authorization code. This variable should be changed if this app is registered under a different client name in the EHR.  You can also use the `/register` page to manage client ids for multiple EHR's.                                               |
| REACT_APP_DEFAULT_ISS             | `http://localhost:8080/test-ehr/r4`                                                   | This is the base url of the EHR that the app will attempt to authenticate against when launched standalone.  This URL is not used when the app is launched from an EHR.                                                |
| REACT_APP_DEVELOPER_MODE          | `true`                                                                                | When set to 'true', enables developer functions like allowing forms to be submitted without actually filling out all required fields.                                                |
| REACT_APP_ETASU_STATUS_ENABLED    | `true`                                                                                | When set to 'true', shows the ETASU status on the main page.  This allows the user to see progress towards completion of the REMS requirements.                                                |
| REACT_APP_PHARMACY_STATUS_ENABLED | `true`                                                                                | When set to 'true', shows the pharmacy status on the main page. This allows the user to track progress towards dispensing the medication from the pharmacy.                                                 |
| REACT_APP_REMS_ADMIN_SERVER_BASE  | `http://localhost:8090`                                                               | The base url of the REMS admin server, which handles the ETASU and questionnaires. Should be changed to match the base url of the REMS admin you wish to submit information to.                   |
| REACT_APP_SEND_FHIR_AUTH_ENABLED  | `false`                                                                               | When set to 'true', the app will send the access token for the EHR to the REMS admin as part of the CDS Hook.  Should be changed to false only if this functionality is required for the REMS admin to work, and is a trusted party.                                                |

**Note that .env values can only be accessed by the React app starting with `REACT_APP_`\**
