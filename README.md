# GuardTrail Client

A React web application for the GuardTrail crowdsourced trail 
conditions platform.

GuardTrail gives hikers the abilty to track and report adverse trail condition like ice, washouts, and downed trees in real time, giing later hikers a heads-up about what they may encounter. Trail maintenance crews can also use teh app to see where hikers have found problems and resolve them.

## Live app
http://guardtrail-frontend.s3-website-us-east-1.amazonaws.com

## Tech stack
- React
- Leaflet.js + react-leaflet (interactive map)
- Esri World Imagery (satellite basemap)
- AWS Amplify (Cognito authentication)
- Amazon S3 (static hosting)

## Features
- Interactive satellite map centered on Wisconsin
- Click-to-place pin for submitting trail condition reports
- Filter reports by condition type
- Full CRUD — create, view, update, and resolve reports
- Responsive design for desktop and mobile
- Role-based access for land managers
