#!/usr/bin/env node

/* eslint max-len: 0 */
const request = require('superagent');
const logger = require('../../components/logger')(module);
const Const = require('../../defs/const.js');
const program = require('commander');

require('dotenv').config({path: '../../../../.env'});
const Promise = require('bluebird');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const usersSchema = require('../../models/schemas/users').usersSchema;

const dbConn = mongoose.createConnection(process.env.DB_CONN, {
  dbName: process.env.DB_NAME, useNewUrlParser: true,
});

const Users = dbConn.model('users', usersSchema);

dbConn.on('error', () => {
  throw new Error(`unable to connect to database: ${process.env.DB_NAME}`);
});

dbConn.on('connected', () => {
  logger.info('DB connection is now OPENED!');

  Users.estimatedDocumentCount(function(err, count) {
    logger.info('There are ' + JSON.stringify(count) + ' users in the DB');
  });
});

// const Users = dbConn.model('users', usersSchema);

const myOptions = {
  count: 2,
  baseEmail: 'test@worbli.io',
  randomEmail: false,
  randomEmailDomain: 'example.com',
  variableEmail: false,
  withOnfido: false,
};

const _varyEmail = function(baseEmail) {
  const parts = baseEmail.split('@');
  const suffix = Math.floor(Math.random()*(Const.SHORTCODE_MAX-Const.SHORTCODE_MIN+1)+Const.SHORTCODE_MIN);
  return parts[0] + '+' + suffix + '@' + parts[1];
};

const _randomEmail = function(domain='example.com') {
  const suffix = Math.floor(Math.random()*(Const.SHORTCODE_MAX-Const.SHORTCODE_MIN+1)+Const.SHORTCODE_MIN);
  return 'test' + suffix + '@' + domain;
};

const _randomEmails = function(domain='example.com', count=50, func=_randomEmail) {
  const emails = [];
  for (let i = 0; i < count; i++) {
    const rEmail = func(domain);
    if (emails.includes(rEmail)) {
      i--;
    } else {
      emails.push(rEmail);
    }
  }

  return emails;
};

const _main = async function() {
  let emails = [];

  if (myOptions.randomEmail) {
    emails = _randomEmails(myOptions.randomEmailDomain, myOptions.count);
  } else if (myOptions.variableEmail) {
    emails = _randomEmails(myOptions.baseEmail, myOptions.count, _varyEmail);
  }

  for (let i = 0; i < myOptions.count; i++) {
    logger.info('Generated a user with email ' + JSON.stringify(emails[i]));

    let defUser = new Users({
      email: emails[i],
      password: 'bozoPass!',
      agreed_terms: true,
      agreed_marketing: false,
      verify_token: 'cc2b039697793f4f38aa908f07fd2974',
    });

    defUser = await defUser.save().catch(function(err) {
      logger.error('Error saving the user: ' + JSON.stringify(err));
    });

    if (defUser === undefined) {
      i--;
      continue;
    }

    logger.info('Created a user ' + JSON.stringify(defUser.email));

    if (!myOptions.withOnfido) {
      defUser.verify_token = '';
      defUser = await defUser.save();
      logger.info('Removed the verification token from user ' + JSON.stringify(defUser.email));
    } else {
      await request
          .post('https://dev-api.worbli.io/api/v3/user/verify/')
          .auth()
          .set('Accept', 'application/json')
          .send({token: defUser.verify_token})
          .catch(function(err) {
            logger.error('Error verifying user ' + JSON.stringify(defUser.email) + ', err: ' + JSON.stringify(err));
          });
    }
  }

  mongoose.disconnect();
};

program
    .arguments('<count>')
    .option('-b, --baseemail <email>', 'The email address to vary')
    .option('-r, --randomdomain <domain>', 'The domain at which to create random emails')
    .option('-w, --withonfido <true/false>', 'Create Onfido users as well')
    .action(function(count) {
      if (program.baseemail && program.randomdomain) {
        logger.error('Error: Please specify only one of the --baseemail or --randomdomain options.');
        process.exit(1);
      }

      if (!program.baseemail && !program.randomdomain) {
        logger.error('Error: Please specify at least one of the --baseemail or --randomdomain options.');
        process.exit(1);
      }

      if (program.baseemail) {
        myOptions.variableEmail = true;
        myOptions.baseEmail = program.baseemail;
      }

      if (program.randomdomain) {
        myOptions.randomEmail = true;
        myOptions.randomEmailDomain = program.randomdomain;
      }

      myOptions.count = count;

      _main();
    }).parse(process.argv);
