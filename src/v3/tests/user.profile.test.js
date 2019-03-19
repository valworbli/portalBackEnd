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

const baseTestUrl = '/api/v3/user/';
const defUser = new Users({
  email: 'test11@example.com',
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
    done();
  });
};

describe('## User', () => {
  const testUrl = baseTestUrl + 'profile/';
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

    it('should return 200 and data true', (done) => {
      request(app)
          .post(testUrl)
          // .auth()
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({password: 'bozoPass!',
            newPassword: 'someNewPass!!!'})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('logs in with the new pass - should return 200 and true', (done) => {
      request(app)
          .post('/api/v3/visitor/signin/')
          .set('Accept', 'application/json')
          .send({email: defUser.email, password: 'someNewPass!!!'})
          .expect(HttpStatus.OK)
          .then((res) => {
            expect(res.body.jwt).to.be.not.null;
            expect({data: true});
            jwtToken = res.body.jwt;
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the token is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .send({password: defUser.password,
            newPassword: 'newBogusPass'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the password is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({newPassword: 'newBogusPass'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because the new password is missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({password: 'bogusPass'})
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    // eslint-disable-next-line max-len
    it('should return 400 because all the parameters are missing', (done) => {
      request(app)
          .post(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send()
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });
  });
});
