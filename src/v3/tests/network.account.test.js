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

const baseTestUrl = '/api/v3/network/';
const defUser = new Users({
  email: 'test13@example.com',
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
  const testUrl = baseTestUrl + 'account/';
  let jwtToken = '';

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

    // eslint-disable-next-line max-len
    it('should return 400 and data false as the user is ONFIDO unverified', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({accountName: 'moomoonow',
            // eslint-disable-next-line max-len
            publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
            // eslint-disable-next-line max-len
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 and data false as the account name is taken', (done) => {
      defUser.save(function(err, user) {
        expect(err).to.be.null;
        expect(user.verify_token).to.equal(defUser.verify_token);

        request(app)
            .post(testUrl)
            .set('Accept', 'application/json')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({accountName: 'webcomponent',
              // eslint-disable-next-line max-len
              publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
              // eslint-disable-next-line max-len
              publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
            .expect(HttpStatus.BAD_REQUEST)
            .then((res) => {
              expect({data: true});
              done();
            }).catch(done);
      });
    });

    it('should return 200 and data true', (done) => {
      defUser.onfido_status = Const.ONFIDO_STATUS_APPROVED;
      defUser.save(function(err, user) {
        expect(err).to.be.null;
        expect(user.verify_token).to.equal(defUser.verify_token);

        request(app)
            .post(testUrl)
            .set('Accept', 'application/json')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send({accountName: 'moomoonow',
              // eslint-disable-next-line max-len
              publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
              // eslint-disable-next-line max-len
              publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
            .expect(HttpStatus.OK)
            .then((res) => {
              expect({data: true});
              done();
            }).catch(done);
      });
    });

    // eslint-disable-next-line max-len
    it('should return 400 as the account name is already taken in the DB', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({accountName: 'moomoonow',
            // eslint-disable-next-line max-len
            publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
            // eslint-disable-next-line max-len
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          }).catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the token is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({accountName: 'moomoonow',
            // eslint-disable-next-line max-len
            publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
            // eslint-disable-next-line max-len
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the accountName is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          // eslint-disable-next-line max-len
          .send({publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
            // eslint-disable-next-line max-len
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the publicKeyActive is wrong', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({accountName: 'moomoonow',
            publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0',
            // eslint-disable-next-line max-len
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r3f3f'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the publicKeyOwner is wrong', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({accountName: 'moomoonow',
            // eslint-disable-next-line max-len
            publicKeyActive: 'EOSfj49942rxm249rxm2049rx240294xm0249rxm2094rx24r34x9',
            publicKeyOwner: 'EOSfj49942rxm249rxm2049rx240294xm0249'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });
  });
});
