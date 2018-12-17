# Portal Backend

[![Build Status](https://travis-ci.org/worbli/portalBackEnd.svg?branch=master)](https://travis-ci.org/worbli/portalBackEnd)

### Node Installation Guide

##### Mongo DB

``` 
sudo apt-get install mongodb-org
sudo systemctl start mongod
```

##### Prerequisites

  Install [node.js](https://nodejs.org)).
  npm install pm2

##### Install Dependancies

  npm install

##### Start Import of snapshot

  node import-snapshot.js

##### Start API

  pm2 start worbli-api --watch



