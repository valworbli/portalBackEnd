/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const assert = chai.assert;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);
const Const = require('../defs/const.js');

require('dotenv').config();
const Promise = require('bluebird');
const Users = require('../models/schemas/users');
const mongoose = require('mongoose');
mongoose.Promise = Promise;

chai.config.includeStack = true;

const baseTestUrl = '/api/v3/identity/';
const options = {
  count: 2,
  baseEmail: 'valentin@worbli.io',
  randomEmail: true,
  randomEmailDomain: 'example.com',
  variableEmail: false,
  withOnfido: true,
};

const _varyEmail = function(baseEmail) {
  const parts = baseEmail.split('@');
  const suffix = Math.floor(Math.random()*(Const.SHORTCODE_MAX-Const.SHORTCODE_MIN+1)+Const.SHORTCODE_MIN);
  return parts[0] + '+' + suffix + '@' + parts[1];
}

const _randomEmail = function(domain='example.com') {
  const suffix = Math.floor(Math.random()*(Const.SHORTCODE_MAX-Const.SHORTCODE_MIN+1)+Const.SHORTCODE_MIN);
  return 'test' + suffix + '@' + domain;
}

const _randomEmails = function(domain='example.com', count=50, func=_randomEmail) {
  let emails = [];
  for (var i = 0; i < count; i++) {
    const rEmail = func(domain);
    if (emails.includes(rEmail))
      i--;
    else
      emails.push(rEmail);
  }

  return emails;
}

describe('## User', function() {
  this.timeout(300000);
  const testUrl = baseTestUrl + 'image/';
  let jwtToken = '';

  describe(`# POST ${testUrl}`, () => {
    let mustDisconnect = false;
    before(function(done) {
      if (mongoose.connection.readyState === 0) {
        mustDisconnect = true;
        mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`,
            {useNewUrlParser: true}, function(err) {
              expect(err).to.be.null;
              done();
            });
      } else {
        done();
      }
    });

    after(function(done) {
      if (mustDisconnect) {
        mongoose.disconnect(done);
      } else {
        done();
      }
    });

    it('creates the users', async function(done) {
      let emails = [];
      if (options.randomEmail)
        emails = _randomEmails(options.randomEmailDomain, options.count);
      else if (options.variableEmail)
        emails = _randomEmails(options.baseEmail, options.count, _varyEmail);

      for(var i = 0; i < options.count; i++) {
        let defUser = new Users({
          email: emails[i],
          password: 'bozoPass!',
          agreed_terms: true,
          agreed_marketing: false,
          verify_token: 'cc2b039697793f4f38aa908f07fd2974',
        });

        defUser = await defUser.save().catch(function(err) {
          logger.error('Error saving the user: ' + JSON.stringify(err));
          i--;
          continue;
        });

        logger.info('Created a user ' + JSON.stringify(defUser.email));

        if (!options.withOnfido) {
          defUser.verify_token = '';
          defUser = await defUser.save();
          logger.info('Removed the verification token from user ' + JSON.stringify(defUser.email));
        } else {
          await request(app)
          .post('/api/v3/user/verify/')
          .auth()
          .set('Accept', 'application/json')
          .send({token: defUser.verify_token})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
          })
          .catch(function(err) {
            logger.error('Error verifying user ' + JSON.stringify(defUser.email) + ', err: ' + JSON.stringify(err));
          });
        }
      }

      done();
    });
  });
});
