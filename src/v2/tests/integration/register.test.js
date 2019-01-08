const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../../worbli-api');

chai.config.includeStack = true;

describe('## Visitor', () => {
  describe('# POST /api/v1/visitor/register/', () => {
    it('should return 200 and data true', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test2@email.com',
            agreed_terms: true,
            agreed_marketing: false,
          })
          .expect(200)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreed_terms is false', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test@email.com',
            agreed_terms: false,
            agreed_marketing: false,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because email has one atom', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: '@MISTAKE.COM',
            agreed_terms: true,
            agreed_marketing: false,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because email is missing', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            agreed_terms: true,
            agreed_marketing: false,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });

    it('should return 400 because agreed_terms is missing', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test@email.com',
            agreed_marketing: false,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because agreed_marketing is missing', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test@email.com',
            agreed_terms: true,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because agreed_terms is test', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test@email.com',
            agreed_terms: 'mistake',
            agreed_marketing: true,
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
    it('should return 400 because agreed_marketing is test', (done) => {
      request(app)
          .post('/api/v1/visitor/register/')
          .set('Accept', 'application/json')
          .send({
            email: 'test@email.com',
            agreed_terms: true,
            agreed_marketing: 'mistake',
          })
          .expect(400)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
