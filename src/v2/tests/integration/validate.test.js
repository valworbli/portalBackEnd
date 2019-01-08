const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../../worbli-api');
const tokenController = require('../../controllers/visitor.js');

chai.config.includeStack = true;

describe('## Validate', () => {
  it('should return 200 because the token exists', (done) => {
    tokenController._createToken('test@worbli.io')
        .then((data) => {
          return request(app)
              .post('/api/v1/visitor/validate/')
              .set('Accept', 'application/json')
              .set('Authorization', `Bearer ${data.token}`)
              .expect(200);
        })
        .then((res) => {
          expect({data: true});
          done();
        })
        .catch(done);
  });
  it('should return 400 because the token is invalid', (done) => {
    request(app)
        .post('/api/v1/visitor/validate/')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer 11111111111111111111111111111111`)
        .expect(400)
        .then((res) => {
          done();
        })
        .catch(done);
  });
  it('should return 400 because the token length is too short', (done) => {
    request(app)
        .post('/api/v1/visitor/validate/')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer 1111111111111111111111111111111`)
        .expect(400)
        .then((res) => {
          done();
        })
        .catch(done);
  });
  it('should return 400 because the token length is too long', (done) => {
    request(app)
        .post('/api/v1/visitor/validate/')
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer 111111111111111111111111111111111`)
        .expect(400)
        .then((res) => {
          done();
        })
        .catch(done);
  });
  it('should return 400 because the token is a number', (done) => {
    request(app)
        .post('/api/v1/visitor/validate/')
        .set('Accept', 'application/json')
        .set('Authorization', 111111111111111111111111111111111111111)
        .expect(400)
        .then((res) => {
          done();
        })
        .catch(done);
  });
  it('should return 400 because the token doesnt exist', (done) => {
    request(app)
        .post('/api/v1/visitor/validate/')
        .set('Accept', 'application/json')
        .expect(400)
        .then((res) => {
          done();
        })
        .catch(done);
  });
});

