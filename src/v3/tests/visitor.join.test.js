const HttpStatus = require('http-status-codes');
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
let defParams = {
  email: 'test2@example.com',
  password: 'bozoPass!',
  agreedTerms: true,
  agreedMarketing: false,
};

describe('## Visitor', () => {
  const testUrl = baseTestUrl + 'join/';
  let mustDisconnect = false;

  describe(`# POST ${testUrl}`, () => {
    defParams = {
      email: 'test2@example.com',
      password: 'bozoPass!',
      agreedTerms: true,
      agreedMarketing: false,
    };

    before(function(done) {
      if (mongoose.connection.readyState === 0) {
        mustDisconnect = true;
        mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`,
            {useNewUrlParser: true}, done);
      } else {
        done();
      }
    });

    after(function(done) {
      Users.deleteOne({email: defParams.email}, function(err) {
        if (err) {
          logger.error(`Error deleting ${defParams.email}: ${err}`);
        } else {
          logger.info(`Deleted ${defParams.email}`);
        }

        if (mustDisconnect) {
          mongoose.disconnect(done);
        } else {
          done();
        }
      });
    });

    it('should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send(defParams)
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreedTerms is false', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            agreedTerms: false,
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
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

    it('should return 400 because agreed_terms is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            agreedTerms: undefined,
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreed_marketing is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            agreedMarketing: undefined,
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreed_terms is test', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            agreedTerms: 'mistake',
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreed_marketing is test', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({
            ...defParams,
            agreedMarketing: 'mistake',
          })
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
