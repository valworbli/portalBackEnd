const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../../worbli-api');
const tokenController = require('../../controllers/visitor.js');

chai.config.includeStack = true;

describe('## Password', () => {
  describe('# POST /api/v1/visitor/password/', () => {
    it('should return OK', (done) => {
      tokenController._createToken('test4@worbli.io')
          .then((data) => {
            return request(app)
                .post('/api/v1/visitor/password/')
                .set('Accept', 'application/json')
                .send({
                  password: 'sTr0ngPassw0rd',
                  token: data.token,
                })
                .expect(200);
          })
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });
  });

  it('should return 400 because the password is weak', (done) => {
    tokenController._createToken('test4@worbli.io')
        .then((data) => {
          return request(app)
              .post('/api/v1/visitor/password/')
              .set('Accept', 'application/json')
              .send({
                password: 'weak',
                token: data.token,
              })
              .expect(400);
        })
        .then((res) => {
          expect({data: false});
          done();
        })
        .catch(done);
  });

  it('should return 400 because the token is too long', (done) => {
    tokenController._createToken('test4@worbli.io')
        .then((data) => {
          return request(app)
              .post('/api/v1/visitor/password/')
              .set('Accept', 'application/json')
              .send({
                password: 'sTr0ngPassw0rd',
                token: `${data.token}A`,
              })
              .expect(400);
        })
        .then((res) => {
          expect({data: false});
          done();
        })
        .catch(done);
  });

  it('should return 400 because the token is missing', (done) => {
    request(app)
        .post('/api/v1/visitor/password/')
        .set('Accept', 'application/json')
        .send({
          password: 'sTr0ngPassw0rd',
        })
        .expect(400)
        .then((res) => {
          expect({data: false});
          done();
        })
        .catch(done);
  });

  it('should return 400 because the password is missing', (done) => {
    request(app)
        .post('/api/v1/visitor/password/')
        .set('Accept', 'application/json')
        .send({
          token: '2b002ffe6db0c99d8e495b4b85b29bc1',
        })
        .expect(400)
        .then((res) => {
          expect({data: false});
          done();
        })
        .catch(done);
  });
});
