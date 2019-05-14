/* eslint max-len: 0 */
const Users = require('./schemas/users');
const SMSLog = require('./schemas/smsLog');
const logger = require('../components/logger')(module);

/**
 * isSMSAllowed
 * @param {string} userID - the user's _id
 * @return {Promise} a Promise with the user or an error
 */
function isSMSAllowed(userID) {
  return new Promise(function(resolve, reject) {
    Users.findOne({_id: userID}, function(err, user) {
      if (err) {
        reject(err);
        logger.error('isSMSAllowed: DB error: ' + JSON.stringify(err));
      }

      if (user) {
        if (!user.sms_limits) {
          logger.info('isSMSAllowed: user has NO limits, allowing: ' + JSON.stringify(err));
          resolve(true);
        } else {
          const counts = [];
          const curDate = Date.now();
          for (const limit of user.sms_limits) {
            const oldDate = new Date(curDate - limit.seconds*1000);
            counts.push(new Promise(function(resolve, reject) {
              SMSLog.countDocuments({user: userID, time: {$gt: oldDate}}).exec(function(err, count) {
                logger.info('isSMSAllowed countDocuments for limit ' + limit.count +
                  ' sms/' + limit.seconds + ' sec : ' + JSON.stringify(count));
                if (err) reject(err);
                else if (count === undefined) reject(new Error());
                else if (count >= limit.count) reject(new Error());
                else resolve(true);
              });
            }));
          }

          Promise.all(counts).then(function(values) {
            resolve(true);
          }).catch(function(err) {
            reject(err);
          });
        }
      } else {
        reject(new Error('No such user found.'));
      }
    });
  });
}

module.exports = {
  isSMSAllowed,
};
