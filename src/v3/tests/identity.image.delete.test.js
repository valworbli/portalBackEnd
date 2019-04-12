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

const baseTestUrl = '/api/v3/identity/';
const defUser = new Users({
  email: 'test14@example.com',
  password: 'bozoPass!',
  agreed_terms: true,
  agreed_marketing: false,
  verify_token: 'cc2b039697793f4f38aa908f07fd2974',
});

const _saveDefUser = function(done) {
  defUser.save(function(err, user) {
    expect(err).to.be.null;
    expect(user.verify_token).to.equal(defUser.verify_token);
    done();
  });
};

describe('## User', function() {
  this.timeout(5000);
  const testUrl = baseTestUrl + 'image/';
  let jwtToken = '';

  describe(`# DELETE ${testUrl}`, () => {
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

    it('deletes a non-existing image - should return 200 and data true and completed false', (done) => {
      request(app)
          .delete(testUrl + 'selfie')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === false, 'Err completed is not true');
            assert(res.body.missingDocuments[0] === 'selfie', 'Err missingDocuments[0] is not \'selfie\'');
            done();
          })
          .catch(done);
    });

    it('uploads images - should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .attach('BGR_selfie', 'src/samples/images/selfie.jpg')
          .attach('BGR_national_identity_card', 'src/samples/images/sampleID-front.jpg')
          .attach('BGR_national_identity_card_reverse', 'src/samples/images/sampleID-back.jpg')
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === true, 'Err completed is not true');
            assert(res.body.missingDocuments.length === 0, 'Err missingDocuments is not empty');
            done();
          })
          .catch(done);
    });

    it('deletes the selfie - should return 200 and data true and completed false', (done) => {
      request(app)
          .delete(testUrl + 'selfie')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === false, 'Err completed is not true');
            assert(res.body.missingDocuments[0] === 'selfie', 'Err missingDocuments[0] is not \'selfie\'');
            done();
          })
          .catch(done);
    });

    it('uploads additional images - should return 200, data true and completed true', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .attach('BGR_selfie', 'src/samples/images/selfie.jpg')
          .attach('BGR_passport', 'src/samples/images/sampleID-front.jpg')
          .attach('BGR_driving_license', 'src/samples/images/sampleID-back.jpg')
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === true, 'Err completed is not false');
            assert(res.body.missingDocuments.length === 0, 'Err missingDocuments is not empty');
            done();
          })
          .catch(done);
    });

    it('deletes the passport - should return 200 and data true and completed true', (done) => {
      request(app)
          .delete(testUrl + 'passport')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === true, 'Err completed is not true');
            assert(res.body.missingDocuments.length === 0, 'Err missingDocuments is not empty');
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
          .set('Authorization', `Bearer WRONGTOKEN.blahblah.blahblah`)
          .set('Accept', 'application/json')
          .send()
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });
  });
});
