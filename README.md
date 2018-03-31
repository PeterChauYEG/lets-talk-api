# lets-talk-api
This is the api for lets-talk 4. It controls the drivetrain of the robot.

It starts a HTTP server on 8080.

## To Do
- User Auth

## Operations
Install with: `yarn install`
Start with: `npm start`

## Deployment
Switch to the project: `gcloud config set project <projectId>`

Deploy the project: `gcloud app deploy` or `npm run deploy`

Allow 8080 through the gcloud firewall;
```
gcloud compute firewall-rules create default-allow-websockets --allow tcp:8080 --target-tags websocket --description "Allow websocket traffic on port 8080"
```

or

`npm run allowPort`
