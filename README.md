# Gramps.js

A single-page frontend for the <a href="https://gramps-project.org">Gramps</a> Genealogical Research system.

## About

This is a Javascript web app to browse a Gramps genealogy database that is powered by the <a href="https://github.com/gramps-project/gramps-webapi">Gramps Web API</a>. The app is based on <a href="https://open-wc.org/">Open Web Components</a> and <a href="https://lit-element.polymer-project.org/">LitElement</a>.

(Its ancestor is the <a href="https://github.com/DavidMStraub/gramps-webapp-frontend">frontend</a> of the legacy <a href="https://github.com/DavidMStraub/gramps-webapp">Gramps web app</a>.)

## Demo

A demo deployment based on the Gramps example family tree is available at https://grampsjs-demo.herokuapp.com.

## Development setup

Install Node.js with [`nvm`](https://www.google.com/search?channel=fs&client=ubuntu&q=nvm):

```
nvm install 15.1.0
```

Clone the repository and, at its root run
```
npm install
```
to install dependencies.

A backend can be started with
```
python -m gramps_webapi --config path/to/config run --port 5555
```
(for details see https://github.com/gramps-project/gramps-webapi).

You can now run the frontend with 
```
npm run start
```
Storybook (to view individual web components with needing to run a backend) is invoked with
```
npm run storybook
```

To build the frontend for deployment, run
```
npm run build
```

## Deployment

To deploy this app, you need a running [Gramps Web API instance](https://github.com/gramps-project/gramps-webapi).

There are two options for running the app:

- Put the distribution (downloaded from a release or built following the above instrutions) on the server running the API and point the API's `STATIC_PATH` config option to the directory containing the distribution

- Change the `__APIHOST__` variable in the frontend distribution to the base URL of your API instance, build the frontend and host it on a separate web server. For this to work, it requires CORS to be enabled in the API.
