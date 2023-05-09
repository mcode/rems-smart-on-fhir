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

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

