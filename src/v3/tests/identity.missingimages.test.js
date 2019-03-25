const HttpStatus = require('http-status-codes');
const Const = require('../defs/const.js');
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

const baseTestUrl = '/api/v3/identity/';
const defUser = new Users({
  email: 'test15@example.com',
  password: 'bozoPass!',
  agreed_terms: true,
  agreed_marketing: false,
  onfido_status: Const.ONFIDO_STATUS_UNVERIFIED,
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

describe('## User', () => {
  const testUrl = baseTestUrl + 'missingimages/';
  let jwtToken = '';

  describe(`# GET ${testUrl}`, () => {
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

    it('should return 200 and data true', (done) => {
      request(app)
          .post('/api/v3/identity/image/')
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .attach('BGR_selfie', 'src/samples/images/sampleID-front.jpg')
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

    it('should return 200 and data true', (done) => {
      request(app)
          .get(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            expect({completed: true});
            expect({missingDocuments: []});
            done();
          })
          .catch(done);
    });

    it('should return 200 and data true', (done) => {
      Users.updateOne(
          {email: defUser.email},
          {$set: {'identity_images.uploaded_documents': [],
            'identity_images.completed': false}}, function(err, user) {
            request(app)
                .get(testUrl)
                .set('Accept', 'application/json')
                .set('Authorization', `Bearer ${jwtToken}`)
                .attach('BGR_selfie', 'src/samples/images/sampleID-front.jpg')
                .expect(HttpStatus.OK)
                .then((res) => {
                  expect({data: true});
                  expect({completed: false});
                  expect({missingDocuments: ['identity']});
                  done();
                })
                .catch(done);
          });
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the token is missing', (done) => {
      request(app)
          .get(testUrl)
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
          .get(testUrl)
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
