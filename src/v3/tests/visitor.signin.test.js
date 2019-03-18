const HttpStatus = require('http-status-codes');
const Const = require('../defs/const');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);

require('dotenv').config();
const Promise = require('bluebird');
const Users = require('../models/schemas/users');
const mongoose = require('mongoose');
mongoose.Promise = Promise;

chai.config.includeStack = true;

const baseTestUrl = '/api/v3/visitor/';
const defUser = new Users({
  email: 'test432@example.com',
  password: 'bozoPass!',
  agreed_terms: true,
  agreed_marketing: false,
  onfido_status: Const.ONFIDO_STATUS_UNVERIFIED,
});

const defParams = {
  email: defUser.email,
  password: defUser.password,
};

describe('## Visitor', () => {
  const testUrl = baseTestUrl + 'signin/';
  let mustDisconnect = false;

  describe(`# POST ${testUrl}`, () => {
    const _saveDefUser = function(done) {
      defUser.save(function(err, user) {
        expect(err).to.be.null;
        expect(user.reset_token).to.equal(defUser.reset_token);
        done();
      });
    };

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

    it('should return 409 as the user is not verified', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send(defParams)
          .expect(HttpStatus.CONFLICT)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    it('verifies the user - should return 200 and data true', (done) => {
      request(app)
          .post('/api/v3/user/verify/')
          .auth()
          .set('Accept', 'application/json')
          .send({token: defUser.verify_token})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('actual log in - should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send(defParams)
          .expect(HttpStatus.OK)
          .then((res) => {
            expect(res.token).to.be.not.null;
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('should return 400 because email has one atom', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            email: '@MISTAKE.COM',
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because email is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            email: undefined,
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 401 because email is wrong', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            email: 'wrongemail@example.com',
          })
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 401 because the password is wrong', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            password: 'wrongpass',
          })
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
