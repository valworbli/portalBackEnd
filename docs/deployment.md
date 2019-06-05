# Portal Backend

Production( branch: master )
[![Build Status](https://travis-ci.org/worbli/portalV2FrontEnd.svg?branch=master)](https://travis-ci.org/worbliportalV2FrontEnd)

Stage( branch: uat )
[![Build Status](https://travis-ci.org/worbli/portalV2FrontEnd.svg?branch=uat)](https://travis-ci.org/worbli/portalV2FrontEnd)

Dev( branch: dev )
[![Build Status](https://travis-ci.org/worbli/portalV2FrontEnd.svg?branch=dev)](https://travis-ci.org/worbli/portalV2FrontEnd)

## Dev
To be built

Configured to build on any events against the uat branch of the github repository.  Pushes image to stage repo tagged with "latest" tag.  Finally deploys the latest docker image to the ECS cluster.

**Account**: dev  
**Branch**: uat  

**Pipeline**: portal-api-stage  
**Image Repo**: 373953752322.dkr.ecr.us-east-1.amazonaws.com/portal/api/stage

**ECS Cluster**: portal-api-stage 
**ECS Service**: portal-api-stage 
**ECS task definition**: portal-api-stage 

The service is configured to join the following load balancer / target group:  
**Load Balancer**: portal-api-stage  
**target group**: portal-api-stage  
**URL**: https://portal-api.stage.worbli.io  

***

## Stage
Configured to build on any events against the uat branch of the github repository.  Pushes image to stage repo tagged with "latest" tag.  Finally deploys the latest docker image to the ECS cluster.

**Account**: dev  
**Branch**: uat  

**Pipeline**: portal-api-stage  
**Image Repo**: 373953752322.dkr.ecr.us-east-1.amazonaws.com/portal/api/stage

**ECS Cluster**: portal-api-stage 
**ECS Service**: portal-api-stage 
**ECS task definition**: portal-api-stage 

The service is configured to join the following load balancer / target group:  
**Load Balancer**: portal-api-stage  
**target group**: portal-api-stage  
**URL**: https://portal-api.stage.worbli.io  

***

## Production
The project is built and a new cotainer image pushed to the production repo when any events occur on the master branch.  Deployment is manged from the production account and managed directly from the ECS dashboard.

### build
Configured to build on any events against the master branch of the github repository.  Pushes image to uat repo tagged with "latest" tag.  Deployment is NOT automated and needs to be done via the console or the cli.

**Account**: dev  
**Branch**: master  

**Pipeline**: portal-api-master  
**Image Repo**: 373953752322.dkr.ecr.us-east-1.amazonaws.com/portal/api/master

### deploy
Deployment is triggered manually from the ECS dashboard in the console.  It is also possible to trigger a service update via the cli.

**Account**: prod  
**ECS Cluster**: portal-api  
**ECS Service**: portal-api  
**ECS task definition**: portal-api  

The service is configured to join the following load balancer / target group:  
**Load Balancer**: portal-api  
**target group**: portal-api
**URL**: https://portal-api.worbli.io  

