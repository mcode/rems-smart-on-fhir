# Getting Started with REMS SMART on FHIR

The REMS SMART on FHIR application can be launched from an EHR that does not support CDS Hooks. The application will interact with the REMS Administrator using CDS Hooks on behalf of the EHR, allowing the provider to complete the normal REMS workflow. 

This application must be launched by an EHR or SMART sandbox imitating an EHR.

## Initialization
After cloning the repository, the submodules must be initialized. To do this you can run:

### `git submodule update --init`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:4040](http://localhost:4040) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### How To Override Defaults
The .env file contains the default URI paths, these can be overwritten from the start command as follows:
 `REACT_APP_REMS_HOOKS_PATH=http://example.com PORT=6000 npm start`
 
Following are a list of modifiable paths: 

| URI Name      | Default |
| ----------- | ----------- |
| REACT_APP_REMS_ADMIN_SERVER_BASE       | `http://localhost:8090`  |
| REACT_APP_REMS_HOOKS_PATH   | `/cds-services/rems-order-sign`        |
| REACT_APP_PHARMACY_SERVER_BASE       | `http://localhost:5051`  |
| REACT_APP_ETASU_STATUS_ENABLED       | `true`  |
| REACT_APP_PHARMACY_STATUS_ENABLED       | `true`  |
| REACT_APP_DEVELOPER_MODE        | `true`  |
| REACT_APP_SEND_RX_ENABLED       | `true`  |
| REACT_APP_SEND_FHIR_AUTH_ENABLED       | `true`  |
| PORT   | `4040`|

 *Note that .env values can only be accessed by react app starting with `REACT_APP_`*


### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

