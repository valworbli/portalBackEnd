#!/usr/bin/env node

/* eslint max-len: 0 */
require('dotenv').config({path: '../../../../.env'});
const Promise = require('bluebird');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const Const = require('../../defs/const');

const usersSchema = require('../../models/schemas/users').usersSchema;
// const logSchema = require('../../models/schemas/log').logSchema;
// const sharegrabRequestSchema = require('../../models/schemas/sharegrabRequest').sharegrabRequestSchema;
// const snapShotSchema = require('../../models/schemas/snapShot').snapShotSchema;

const logger = require('../../components/logger')(module);

const oldDbConn = mongoose.createConnection(process.env.MIGRATION_DB_CONN, {
  dbName: process.env.MIGRATION_DB_NAME, useNewUrlParser: true,
});

const newDbConn = mongoose.createConnection(process.env.MIGRATION_DB_CONN_NEW, {
  dbName: process.env.MIGRATION_DB_NAME_NEW, useNewUrlParser: true,
});

// const OldLogs = oldDbConn.model('logs', logSchema);
// const NewLogs = newDbConn.model('logs', logSchema);

// const OldSGRequest = oldDbConn.model('sharegrab_requests', sharegrabRequestSchema);
// const NewSGRequest = newDbConn.model('sharegrab_requests', sharegrabRequestSchema);

// const OldSnapShot = oldDbConn.model('snapshots', snapShotSchema);
// const NewSnapShot = newDbConn.model('snapshots', snapShotSchema);

const OldUsers = oldDbConn.model(process.env.MIGRATION_COLL_NAME, usersSchema);
const NewUsers = newDbConn.model(process.env.MIGRATION_COLL_NAME_NEW, usersSchema);

const savers = [];
let count = 0;

/**
 * Copies records from one collection to another
 * @param {object} oldColl
 * @param {object} newColl
 * @param {string} name
 */
// async function CopyRecords(oldColl, newColl, name='unnamed') {
//   await new Promise(function(resolve, reject) {
//     oldColl.estimatedDocumentCount(async function(err, count) {
//       let myCount = 0;
//       logger.info('Found ' + count + ' entries in ' + name);
//       savers = [];
//       newColl.deleteMany({}).exec();
//       const cursor = oldColl.find().cursor();

//       cursor.on('data', function(entry) {
//         logger.info('Processing ' + name + ' entry ' + ++myCount + '/' + count);
//         // eslint-disable-next-line new-cap
//         const newEntry = new newColl({...entry._doc});
//         delete newEntry._id;

//         savers.push(newEntry.save().catch(function(err) {
//           if (err) {
//             logger.error('Error saving the new ' + name + ': ' + JSON.stringify(err));
//           }
//         }));
//       });

//       cursor.on('close', function() {
//         // Called when done
//         myCount = 0;
//         logger.info('Saving ' + savers.length + ' ' + name + ' entries...');
//         Promise.all(savers).then(function(values) {
//           for (const value of values) {
//             logger.info('Saved ' + name + ' entry ' + ++myCount + '/' + count);
//           }
//         }).catch(function(err) {
//           logger.error('Error SAVING ' + name + ', err: ' + JSON.stringify(err));
//         }).finally(function() {
//           logger.info('EOF reading ' + name);
//           resolve();
//         });
//       });
//     });
//   });

//   logger.info('Copied all ' + name + ' entries');
// }

newDbConn.once('open', async function() {
  logger.info('Connected to database');
  // await CopyRecords(OldLogs, NewLogs, 'log');
  // await CopyRecords(OldSGRequest, NewSGRequest, 'sharegrab_requests');
  // await CopyRecords(OldSnapShot, NewSnapShot, 'snapshot');

  logger.info('Copying users...');
  NewUsers.deleteMany({}).exec();
  const cursor = OldUsers.find().cursor();
  cursor.on('data', function(user) {
    let onfidoId = undefined;
    let onfidoStatus = undefined;

    logger.info('Got an OLD user: ' + JSON.stringify(user.email) + ', count: ' + count++);
    const nUser = {...user._doc};

    if (nUser.onfido_id) {
      onfidoId = nUser.onfido_id;
      onfidoStatus = nUser.onfido_status;

      switch (onfidoStatus) {
        case 'default':
          onfidoStatus = Const.ONFIDO_STATUS_NONE;
          break;
        case 'started':
          onfidoStatus = Const.ONFIDO_STATUS_PENDING;
          break;
        case 'credited':
          onfidoStatus = Const.ONFIDO_STATUS_APPROVED;
          break;
        case 'named':
          onfidoStatus = Const.ONFIDO_STATUS_APPROVED;
          break;
        case 'approved':
          onfidoStatus = Const.ONFIDO_STATUS_APPROVED;
          break;
        case 'rejected':
          onfidoStatus = Const.ONFIDO_STATUS_REJECTED;
          break;
        case 'review':
          onfidoStatus = Const.ONFIDO_STATUS_PENDING;
          break;
        default:
          // onfidoStatus = Const.ONFIDO_STATUS_CREATED;
          logger.info('UNKNOWN OnFido status: ' + JSON.stringify(onfidoStatus) + ', passing it through...');
          break;
      }

      nUser.onfido = {onfido_id: onfidoId, onfido_status: onfidoStatus, onfido_error: false};
      delete nUser.onfido_id;
      delete nUser.onfido_status;
    }

    nUser.agreed_terms = true;
    nUser.verified_on = Date.now();
    nUser.verified_from_ip = '127.0.0.1';
    nUser.date_birth = new Date(Date.UTC(nUser.date_birth_year, nUser.date_birth_month - 1, nUser.date_birth_day));

    delete nUser._id;
    delete nUser.date_birth_year;
    delete nUser.date_birth_month;
    delete nUser.date_birth_day;

    if (nUser.address_building_name) {
      nUser.address_two += ', building: ' + nUser.address_building_name;
      delete nUser.address_building_name;
    }
    if (nUser.address_building_number) {
      nUser.address_two += ', building number: ' + nUser.address_building_number;
      delete nUser.address_building_number;
    }
    if (nUser.address_flat_number) {
      nUser.address_two += ', flat: ' + nUser.address_flat_number;
      delete nUser.address_flat_number;
    }

    if (nUser.address_two.startsWith(', ')) {
      nUser.address_two = nUser.address_two.substring(', '.length, nUser.address_two.length);
    }

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
      return NewUsers.updateMany({}, {verify_token: ''});
    }).then(function(value) {
      logger.info('Cleared the verification tokens from all users');
    }).catch(function(err) {
      logger.error('Error SAVING, err: ' + JSON.stringify(err));
    }).finally(function() {
      oldDbConn.close();
      newDbConn.close();
      logger.info('EOF reading the users, disconnected.');
    });
  });
});
