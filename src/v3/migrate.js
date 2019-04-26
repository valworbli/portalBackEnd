require('dotenv').config({ path: '../../.env' })
const Promise = require('bluebird');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Const = require('./defs/const');

const usersSchema = require('./models/schemas/users').usersSchema;
const logSchema = require('./models/schemas/log').logSchema;
const sharegrabRequestSchema = require('./models/schemas/sharegrabRequest').sharegrabRequestSchema;
const snapShotSchema = require('./models/schemas/snapShot').snapShotSchema;

const logger = require('./components/logger')(module);

const oldDbConn = mongoose.createConnection(process.env.DB_CONN, {
  dbName: process.env.DB_NAME, useNewUrlParser: true,
});

const newDbConn = mongoose.createConnection(process.env.DB_CONN, {
  dbName: process.env.DB_NAME_NEW, useNewUrlParser: true,
});

const OldLogs = oldDbConn.model('Log', logSchema);
const NewLogs = newDbConn.model('Log', logSchema);

const OldSGRequest = oldDbConn.model('sharegrab_request', sharegrabRequestSchema);
const NewSGRequest = newDbConn.model('sharegrab_request', sharegrabRequestSchema);

const OldSnapShot = oldDbConn.model('SnapShot', snapShotSchema);
const NewSnapShot = newDbConn.model('SnapShot', snapShotSchema);

const OldUsers = oldDbConn.model('users', usersSchema);
const NewUsers = newDbConn.model('users', usersSchema);

NewLogs.deleteMany({}).exec();
let cursor = OldLogs.find().cursor();
cursor.on('data', function(log) {
  const nLog = {...log._doc};
  const newLog = new NewLogs(nLog);

  newLog.save(function(err, newLog) {});
});

NewSGRequest.deleteMany({}).exec();
cursor = OldSGRequest.find().cursor();
cursor.on('data', function(sgReq) {
  const nSG = {...sgReq._doc};
  const newSG = new NewLogs(nSG);

  newSG.save(function(err, newSG) {});
});

NewSnapShot.deleteMany({}).exec();
cursor = OldSnapShot.find().cursor();
cursor.on('data', function(snapShot) {
  const nSnapShot = {...snapShot._doc};
  const newSnapShot = new NewLogs(nSnapShot);

  newSnapShot.save(function(err, newSS) {});
});

NewUsers.deleteMany({}).exec();
const savers = [];

cursor = OldUsers.find().cursor();
cursor.on('data', function(user) {
  let onfidoId = undefined;
  let onfidoStatus = undefined;

  logger.info('Got an OLD user: ' + JSON.stringify(user.email));
  const nUser = {...user._doc};

  if (nUser.onfido_id) {
    onfidoId = nUser.onfido_id;
    onfidoStatus = nUser.onfido_status;

    switch(onfidoStatus) {
      case 'default':
        onfidoStatus = Const.ONFIDO_STATUS_CREATED;
        break;
      case 'started':
        onfidoStatus = Const.ONFIDO_STATUS_PENDING;
        break;
      default:
        onfidoStatus = Const.ONFIDO_STATUS_CREATED;
        logger.error('UNKNOWN OnFido status: ' + JSON.stringify(onfidoStatus));
        break;
    }

    nUser.onfido = { onfido_id: onfidoId, onfido_status: onfidoStatus, onfido_error: false };
    delete nUser.onfido_id;
    delete nUser.onfido_status;
  }

  nUser.verified_on = Date.now();
  nUser.verified_from_ip = '127.0.0.1';
  nUser.date_birth = new Date(Date.UTC(nUser.date_birth_year, nUser.date_birth_month - 1, nUser.date_birth_day));

  if (nUser.address_building_name) {
    nUser.address_two += ', building: ' + address_building_name;
    delete nUser.address_building_name;
  }
  if (nUser.address_building_number) {
    nUser.address_two += ', building number: ' + address_building_number;
    delete nUser.address_building_number;
  }
  if (nUser.address_flat_number) {
    nUser.address_two += ', flat: ' + address_flat_number;
    delete nUser.address_flat_number;
  }

  delete nUser._id;
  delete nUser.date_birth_year;
  delete nUser.date_birth_month - 1;
  delete nUser.date_birth_day;

  const newUser = new NewUsers(nUser);
  savers.push(newUser.save().catch(function(err) {
    logger.error('Error saving new user: ' + newUser.email +
      ', err: ' + JSON.stringify(err));
  }));
});

cursor.on('close', function() {
  // Called when done
  Promise.all(savers).then(function(values) {
    for (const value of values) {
      logger.info('Saved ' + JSON.stringify(value.email));
    }
  }).catch(function(err) {
    logger.error('Error SAVING, err: ' + JSON.stringify(err));
  }).finally(function() {
    oldDbConn.close();
    newDbConn.close();
    logger.info('EOF reading the users, disconnected.');
  });
});
