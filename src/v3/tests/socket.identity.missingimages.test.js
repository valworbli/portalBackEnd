/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const request = require('supertest');
const clientio = require('socket.io-client');

const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const assert = chai.assert;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);
const Const = require('../defs/const');

require('dotenv').config();
const Promise = require('bluebird');
const Users = require('../models/schemas/users');
const mongoose = require('mongoose');

mongoose.Promise = Promise;
chai.config.includeStack = true;

const baseTestUrl = '/api/v3/identity/';
const defUser = new Users({
  email: 'test171@example.com',
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

describe('## Socket User', function() {
  this.timeout(15000);
  const testUrl = baseTestUrl + 'missingimages/';
  let jwtToken = '';
  let socket = undefined;
  let completeDone = false;
  let myDone = undefined;

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

      if (socket) socket.disconnect();
    });

    beforeEach(function(done) {
      setTimeout(function() {
        done();
      }, 500);
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

    const onMissingImagesIncomplete = function(data) {
      logger.info('onMissingImagesIncomplete: ' + JSON.stringify(data));
      // eslint-disable-next-line max-len
      assert(data.completed === false, 'Err completed is not false');
      assert(data.data === true, 'Err data is not true');
      socket.removeListener(Const.SOCKET_MISSING_IMAGES, onMissingImagesIncomplete);
      myDone();
    };

    const onMissingImagesComplete = function(data) {
      logger.info('onMissingImagesComplete: ' + JSON.stringify(data));
      // eslint-disable-next-line max-len
      assert(data.completed === true, 'Err completed is not true');
      assert(data.data === true, 'Err data is not true');
      socket.removeListener(Const.SOCKET_MISSING_IMAGES, onMissingImagesComplete);
      completeDone = true;
      // myDone();
    };

    // eslint-disable-next-line max-len
    it('SOCKET: gets the missing images - should return 200 and data true', (done) => {
      socket = clientio(`http://localhost:9020`, {
        autoConnect: true,
        reconnection: false,
        path: `${process.env.SOCKET_PATH}`,
        query: {
          jwt: jwtToken,
        },
      });
      socket.on('connect', () => {
        logger.info('SOCKET connected!');
      });
      myDone = done;
      socket.on(Const.SOCKET_MISSING_IMAGES, onMissingImagesIncomplete);
      socket.on(Const.SOCKET_ON_CONNECT, function(data) {
        logger.info('SOCKET_ON_CONNECT: ' + JSON.stringify(data));
        done();
      });
    });

    // eslint-disable-next-line max-len
    it('uploads all images - should return 200 and data true', (done) => {
      myDone = done;
      socket.on(Const.SOCKET_MISSING_IMAGES, onMissingImagesComplete);
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
    it('SOCKET: gets the missing images - should return 200 and data true', (done) => {
      myDone = done;
      setTimeout(() => {
        assert(completeDone === true, 'Err completeDone is not true');
        done();
      }, 5000);
    });

    // // eslint-disable-next-line max-len
    // it('checks the images for completeness - should return 200 and data true', (done) => {
    //   request(app)
    //       .get(testUrl)
    //       .set('Accept', 'application/json')
    //       .set('Authorization', `Bearer ${jwtToken}`)
    //       .expect(HttpStatus.OK)
    //       .then((res) => {
    //         expect({data: true});
    //         expect({completed: true});
    //         expect({missingDocuments: []});
    //         done();
    //       })
    //       .catch(done);
    // });

    // // eslint-disable-next-line max-len
    // it('uploads only a selfie - should return 200 and data true', (done) => {
    //   Users.updateOne(
    //       {email: defUser.email},
    //       {$set: {'identity_images.uploaded_documents': [],
    //         'identity_images.completed': false}}, function(err, user) {
    //         request(app)
    //             .get(testUrl)
    //             .set('Accept', 'application/json')
    //             .set('Authorization', `Bearer ${jwtToken}`)
    //             .attach('BGR_selfie', 'src/samples/images/selfie.jpg')
    //             .expect(HttpStatus.OK)
    //             .then((res) => {
    //               expect({data: true});
    //               expect({completed: false});
    //               expect({missingDocuments: ['identity']});
    //               done();
    //             })
    //             .catch(done);
    //       });
    // });

    // // eslint-disable-next-line max-len
    // it('should return 400 because the token is missing', (done) => {
    //   request(app)
    //       .get(testUrl)
    //       .set('Accept', 'application/json')
    //       .send()
    //       .expect(HttpStatus.BAD_REQUEST)
    //       .then((res) => {
    //         expect({data: false});
    //         done();
    //       })
    //       .catch(done);
    // });

    // // eslint-disable-next-line max-len
    // it('should return 401 because the token is malformed', (done) => {
    //   request(app)
    //       .get(testUrl)
    //       .set('Authorization', `Bearer WRONGTOKEN.blahblah.blahblah`)
    //       .set('Accept', 'application/json')
    //       .send()
    //       .expect(HttpStatus.UNAUTHORIZED)
    //       .then((res) => {
    //         expect({data: false});
    //         done();
    //       })
    //       .catch(done);
    // });
  });
});