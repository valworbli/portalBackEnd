/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const assert = chai.assert;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);
const SMSLog = require('../models/schemas/smsLog');

require('dotenv').config();
const Promise = require('bluebird');
const Users = require('../models/schemas/users');
const mongoose = require('mongoose');
mongoose.Promise = Promise;

chai.config.includeStack = true;

const baseTestUrl = '/api/v3/mobile/';
const defUser = new Users({
  email: 'test312@example.com',
  password: 'bozoPass!',
  agreed_terms: true,
  agreed_marketing: false,
  verify_token: 'cc2b039697793f4f38aa908f07fd2974',
});

const _saveDefUser = function(done) {
  defUser.save(function(err, user) {
    expect(err).to.be.null;
    expect(user.verify_token).to.equal(defUser.verify_token);
    user.verify_token = '';
    user.save(function(err, user) {
      expect(err).to.be.null;
      done();
    });
  });
};

describe('## Mobile', function() {
  this.timeout(20000);
  const testUrl = baseTestUrl + 'sms/';
  let jwtToken = ''; let shortcode = 0;

  describe(`# POST ${testUrl}`, () => {
    let mustDisconnect = false;
    before(function(done) {
      if (mongoose.connection.readyState === 0) {
        mustDisconnect = true;
        mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`,
            {useNewUrlParser: true}, function(err) {
              expect(err).to.be.null;
              _saveDefUser(done);
            });
      } else {
        _saveDefUser(done);
      }
    });

    after(function(done) {
      Users.deleteOne({email: defUser.email}, function(err) {
        if (err) {
          logger.error(`Error deleting ${defUser.email}: ${err}`);
        } else {
          logger.info(`Deleted ${defUser.email}`);
        }

        if (mustDisconnect) {
          mongoose.disconnect(done);
        } else {
          done();
        }
      });
    });

    it('logs in - should return 200 and true', (done) => {
      request(app)
          .post('/api/v3/visitor/signin/')
          .set('Accept', 'application/json')
          .send({email: defUser.email, password: 'bozoPass!'})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect(res.body.jwt).to.be.not.undefined;
            expect({data: true});
            jwtToken = res.body.jwt;
            done();
          })
          .catch(done);
    });

    it('generates a short code - should return 200 and data true', (done) => {
      request(app)
          .get('/api/v3/mobile/shortcode')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.shortcode > 99999, 'Err shortcode is less than 100000');
            assert(res.body.shortcode < 1000000, 'Err shortcode is greater than 1000000');
            shortcode = res.body.shortcode;
            done();
          })
          .catch(done);
    });

    it('sends the first SMS - should return 200 and data true', (done) => {
      const number = '+11111111111';
      const message = 'bozo mozo zozo 1';
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number})
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(Number(res.body.shortcode) === shortcode, 'Err the returned shortcode DOES NOT match the submitted one');
            assert(res.body.link.endsWith('/id/' + JSON.stringify(shortcode)), 'Err the link DOES NOT match!');
            Users.findOne({email: defUser.email}, function(err, user) {
              assert(Boolean(err) === false, 'Err could not retrieve the user from the DB post-test');
              const smsEntries = [];
              for (let i = 0; i < 3; i++) {
                const smsLogEntry = new SMSLog({user, number, message});
                smsEntries.push(smsLogEntry.save());
              }

              Promise.all(smsEntries).then(function(values) {
                done();
              }).catch(function(err) {
                logger.error('Error storing THREE SMSes in the DB: ' + JSON.stringify(err));
                done();
              });
            });
          }).catch(function(err) {
            logger.error('GENERIC ERROR: ' + JSON.stringify(err));
            done();
          });
    });

    it('sends the fifth SMS - should return 429 and data false', (done) => {
      const number = '+11111111111';
      const message = 'bozo mozo zozo 2';
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number})
          .expect(HttpStatus.TOO_MANY_REQUESTS)
          .then((res) => {
            assert(res.body.data === false, 'Err data is not false');
            Users.findOne({email: defUser.email}, async function(err, user) {
              assert(Boolean(err) === false, 'Err could not retrieve the user from the DB post-test');
              await SMSLog.deleteMany({user: user}).exec();
              logger.warn('Deleted all SMS log entries for user ' + JSON.stringify(user.email));

              const smsEntries = [];
              for (let i = 0; i < 10; i++) {
                const time = Date.now() - 22*3600*1000;
                const smsLogEntry = new SMSLog({user, number, message, time});
                smsEntries.push(smsLogEntry.save());
              }

              Promise.all(smsEntries).then(function(values) {
                done();
              }).catch(function(err) {
                logger.error('Error storing TEN SMSes in the DB: ' + JSON.stringify(err));
                done();
              });
            });
          }).catch(function(err) {
            logger.error('GENERIC ERROR: ' + JSON.stringify(err));
            done();
          });
    });

    it('sends the eleventh SMS - should return 429 and data false', (done) => {
      const number = '+11111111111';
      const message = 'bozo mozo zozo 3';
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number})
          .expect(HttpStatus.TOO_MANY_REQUESTS)
          .then((res) => {
            assert(res.body.data === false, 'Err data is not false');
            Users.findOne({email: defUser.email}, async function(err, user) {
              assert(Boolean(err) === false, 'Err could not retrieve the user from the DB post-test');
              await SMSLog.deleteMany({user: user}).exec();

              const smsEntries = [];
              for (let i = 0; i < 50; i++) {
                const time = new Date(Date.now() - 122*3600*1000);
                const smsLogEntry = new SMSLog({user, number, message, time});
                smsEntries.push(smsLogEntry.save());
              }

              Promise.all(smsEntries).then(function(values) {
                done();
              }).catch(function(err) {
                logger.error('Error storing FIFTY SMSes in the DB: ' + JSON.stringify(err));
                done();
              });
            });
          }).catch(function(err) {
            logger.error('GENERIC ERROR: ' + JSON.stringify(err));
            done();
          });
    });

    it('sends the fifty-first SMS - should return 429 and data false', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number: '+11111111111'})
          .expect(HttpStatus.TOO_MANY_REQUESTS)
          .then((res) => {
            assert(res.body.data === false, 'Err data is not false');
            Users.findOne({email: defUser.email}, async function(err, user) {
              assert(Boolean(err) === false, 'Err could not retrieve the user from the DB post-test');
              await SMSLog.deleteMany({user: user}).exec();
              done();
            });
          }).catch(function(err) {
            logger.error('GENERIC ERROR: ' + JSON.stringify(err));
            done();
          });
    });
  });
});
