const HttpStatus = require('http-status-codes');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const assert = chai.assert;
const app = require('../../../worbli-api');
const logger = require('../components/logger')(module);
const ofWrapper = require('../components/onfidoWrapper');

require('dotenv').config();
const Promise = require('bluebird');
const Users = require('../models/schemas/users');
const mongoose = require('mongoose');
mongoose.Promise = Promise;

chai.config.includeStack = true;

const baseTestUrl = '/api/v3/user/';
const defUser = new Users({
  email: 'test31@example.com',
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

const defParams = {
  email: defUser.email,
};

describe('## User', () => {
  const testUrl = baseTestUrl + 'verify/';
  let ofID = undefined;

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
      Users.findOne({email: defUser.email}, function(err, user) {
        assert(err === null, 'Err DB err');
        ofWrapper.deleteApplicant(user.onfido.onfido_id).then(() => {
          logger.info('Deleted OnFido applicant ' +
            JSON.stringify(user.onfido.onfido_id));
        }).catch((error) => {
          logger.error('ERROR deleting the OnFido applicant ' +
            JSON.stringify(user.onfido.onfido_id) + 'error: ' +
            JSON.stringify(error));
        }).finally(() => {
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
      });
    });

    beforeEach(function(done) {
      setTimeout(function() {
        done();
      }, 500);
    });

    it('should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          .auth()
          .set('Accept', 'application/json')
          .send({token: defUser.verify_token})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            expect(res.token).to.be.not.null;
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
          .attach('BGR_selfie', 'src/samples/images/rotated_selfie_ccw.jpg')
          .expect(HttpStatus.OK)
          .then((res) => {
            assert(res.body.data === true, 'Err data is not true');
            assert(res.body.completed === false, 'Err completed is not true');
            done();
          })
          .catch(done);
    });

    it('should return 200 and data true', (done) => {
      request(app)
          .post('/api/v3/visitor/forgot/')
          .set('Accept', 'application/json')
          .send(defParams)
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });
  });
});
