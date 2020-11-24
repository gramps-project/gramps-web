# Gramps.js

A single-page frontend for the <a href="https://gramps-project.org">Gramps</a> Genealogical Research system.

## About

This is a Javascript web app to browse a Gramps genealogy database that is powered by the <a href="https://github.com/gramps-project/web-api">Gramps REST API</a>. The app is based on <a href="https://open-wc.org/">Open Web Components</a> and <a href="https://lit-element.polymer-project.org/">LitElement</a>.

Its ancestor is the <a href="https://github.com/DavidMStraub/gramps-webapp-frontend">frontend</a> of the legacy <a href="https://github.com/DavidMStraub/gramps-webapp">Gramps web app</a>.

## Project status

The project is in early development and is not yet ready for use in production.

Contributions are welcome, but please open an issue before starting to work on a feature to avoid duplicate work.

Feature requests are premature :)

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
(for details see https://github.com/gramps-project/web-api).

You can now run the frontend with 
```
npm run start
```
Storybook (to view individual web components with needing to run a backend) is invoked with
```
npm run storybook
```
