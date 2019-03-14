const HttpStatus = require('http-status-codes');
const request = require('supertest');
const chai = require('chai'); // eslint-disable-line import/newline-after-import
const expect = chai.expect;
const app = require('../../../worbli-api');
const jwt = require('../components/jwt');

chai.config.includeStack = true;

const baseTestUrl = '/api/v3/health/';

describe('## Health', () => {
  const testUrl = baseTestUrl + 'live/';

  describe(`# GET ${testUrl}`, () => {
    it('should return 200 and data true', (done) => {
      request(app)
          .get(testUrl)
          .auth()
          .set('Accept', 'application/json')
          .set('Authorization', 'Bearer ' +
            jwt.jwtSign('payload does not matter'))
          .send()
          .expect(HttpStatus.OK)
          .then((res) => {
            expect({data: true});
            done();
          })
          .catch(done);
    });

    it('should return 400 because token is invalid', (done) => {
      request(app)
          .get(testUrl)
          .set('Accept', 'application/json')
          .set('Authorization', `Bearer WRONGTOKEN`)
          .send()
          .expect(HttpStatus.UNAUTHORIZED)
          .then((res) => {
            expect({data: false});
            done();
          })
          .catch(done);
    });

    it('should return 400 because token is missing', (done) => {
      request(app)
          .get(testUrl)
          .set('Accept', 'application/json')
          .send()
          .expect(HttpStatus.BAD_REQUEST)
          .then((res) => {
            done();
          })
          .catch(done);
    });
  });
});
