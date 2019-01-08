const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../../worbli-api');
const tokenController = require('../../controllers/visitor.js');

chai.config.includeStack = true;

describe('## Reset', () => {
  describe('# GET /api/v1/visitor/reset/', () => {
    it('should return OK', (done) => {
      tokenController._createToken('test2@worbli.io')
          .then((data) => {
            return request(app)
                .post('/api/v1/visitor/reset/')
                .set('Accept', 'application/json')
                .send({
                  email: 'test2@email.com',
                })
                .expect(200);
          })
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });
    it('should return 400 because the email is under two atoms', (done) => {
      request(app)
          .post('/api/v1/visitor/reset/')
          .set('Accept', 'application/json')
          .send({
            email: '@email.com',
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 200 because any email is valid', (done) => {
      request(app)
          .post('/api/v1/visitor/reset/')
          .set('Accept', 'application/json')
          .send({
            email: 'invalid@email.com',
          })
          .expect(200)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because the email is not present', (done) => {
      request(app)
          .post('/api/v1/visitor/reset/')
          .set('Accept', 'application/json')
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because the email is a number', (done) => {
      request(app)
          .post('/api/v1/visitor/reset/')
          .set('Accept', 'application/json')
          .send({
            email: 111,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because the email is a bool', (done) => {
      request(app)
          .post('/api/v1/visitor/reset/')
          .set('Accept', 'application/json')
          .send({
            email: true,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
