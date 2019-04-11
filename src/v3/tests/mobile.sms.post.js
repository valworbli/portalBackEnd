/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const assert = chai.assert;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);

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
  this.timeout(5000);
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

    it('sends an SMS - should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number: '+004135364493333', message: 'Hello, world!',
            country: 'GBR', fields: ['drivers_licence']})
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(Number(res.body.shortcode) === shortcode, 'Err the returned shortcode DOES NOT match the submitted one');
            Users.findOne({email: defUser.email}, function(err, user) {
              assert(Boolean(err) === false, 'Err could not retrieve the user from the DB post-test');
              assert(user.shortcodeData.country === 'GBR', 'Err the stored country DOES NOT match the submitted one');
              assert(user.shortcodeData.fields[0] === 'drivers_licence', 'Err the stored document DOES NOT match the submitted one');
              done();
            });
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the token is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({number: '+15551234567', message: 'Sample message'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 401 because the token is malformed', (done) => {
      request(app)
          .post(testUrl)
          .set('Authorization', `Bearer WRONGTOKEN.blahblah.blahblah`)
          .set('Accept', 'application/json')
          .send({number: '+15551234567', message: 'Sample message',
            country: 'GBR', fields: ['drivers_licence']})
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            assert(res.body.data === false, 'Err data is not false');
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 and data false because the input data is invalid', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({number: '+1555123456743943938378373', message: 'Sample message'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
