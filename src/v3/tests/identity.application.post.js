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

const baseTestUrl = '/api/v3/identity/';
const defUser = new Users({
  'email': 'test15@example.com',
  'password': 'bozoPass!',
  'agreed_terms': true,
  'agreed_marketing': false,
  'verify_token': 'cc2b039697793f4f38aa908f07fd2974',
});

const _saveDefUser = function(done) {
  defUser.save(function(err, user) {
    expect(err).to.be.null;
    expect(user.verify_token).to.equal(defUser.verify_token);
    done();
  });
};

describe('## User', function() {
  this.timeout(15000);
  const testUrl = baseTestUrl + 'application/';
  let jwtToken = '';

  describe(`# POST ${testUrl}`, function() {
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

    it('uploads images - should return 200 and data true', (done) => {
      request(app)
          .post('/api/v3/identity/image/')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .attach('BGR_selfie', 'src/samples/images/selfie.jpg')
          // eslint-disable-next-line max-len
          .attach('BGR_national_identity_card', 'src/samples/images/sampleID-front.jpg')
          // eslint-disable-next-line max-len
          .attach('BGR_national_identity_card_reverse', 'src/samples/images/sampleID-back.jpg')
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            expect({completed: true});
            expect({missingDocuments: []});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('submits an application - should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({firstName: 'Bozo', middleName: 'Mozo', lastName: 'Zozo',
            country: 'BGR', day: 9, month: 9, year: 1944, gender: 'Male'})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            Users.findOne({email: defUser.email}, function(err, user) {
              assert(user.name_first === 'Bozo', 'Err firstName');
              assert(user.name_last === 'Zozo', 'Err lastName');
              assert(user.date_birth.getFullYear() === 1944, 'Err year');
              done();
            });
          }).catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 and data false as some of the data is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({middleName: 'Mozo', lastName: 'Zozo',
            country: 'BGR', day: 9, month: 9, year: 1944, gender: 'Male'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the token is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send()
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 401 because the token is malformed', (done) => {
      request(app)
          .post(testUrl)
          .set('Authorization', 'Bearer WRONGTOKEN.blahblah.blahblah')
          .set('Accept', 'application/json')
          .send({firstName: 'Bozo', middleName: 'Mozo', lastName: 'Zozo',
            country: 'BGR', day: 9, month: 9, year: 1944, gender: 'Male'})
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });
  });
});
