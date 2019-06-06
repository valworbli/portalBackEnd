const request = require('request-promise');

exports.handler = async (event) => {
  const options = {
    method: 'POST',
    url: 'https://slack.com/api/chat.postMessage',
    headers: {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + process.env.SLACK_TOKEN,
    },
    body: '{"channel":"random","text":"Test message from AWS Lambda!"}',
  };

  const response = await request(options).catch(function(err) {});
  const res = {
    statusCode: 200,
    body: JSON.stringify(response),
  };

  return res;
};
