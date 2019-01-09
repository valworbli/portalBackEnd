const userModel = require('../models/user.js');
const sharegrabRequestModel = require('../models/sharegrabRequest.js');
const snapShotModel = require('../models/snapShot.js');
const logger = require('../components/logger')(module);
const jwt = require('../components/jwt.js');
const account = require('../components/account.js');
const onfido = require('../components/onfido.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Login
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.email - The email of the user.
 * @property {string} req.body.password - The plain text password of the user.
 */
function postLogin(req, res) {
  try {
    const email = req.body.email;
    const plaintextPassword = req.body.password;
    userModel.find({email}, (err, data) => {
      if (!err && data && data[0] && data[0].password) {
        const hash = data[0].password;
        const email = data[0].email;
        const onfidoStatus = data[0].onfido_status;
        const onfidoId = data[0].onfido_id || null;
        const securityCode = data[0].security_code || null;
        bcrypt.compare(plaintextPassword, hash, function(err, data) {
          if (data === true) {
            const token = jwt.jwtExpires({
              email,
              onfido_status: onfidoStatus,
              onfido_id: onfidoId,
              security_code: securityCode,
            }, '72h');
            res.status(200).json({
              data: true,
              token,
              onfido_status: onfidoStatus,
            });
          } else {
            res.status(400).json({data: false});
          }
        });
      } else {
        res.status(400).json({data: false});
      }
    });
  } catch (err) {
    const error = 'user post login failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Auth
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postAuth(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((data) => {
          const onfidoStatus = data.onfido_status;
          const securityCode = data.security_code;
          logger.info(`postAuth success: ${JSON.stringify(data)}`);
          res.status(200).json({
            data: true,
            onfido_status: onfidoStatus,
            security_code: securityCode,
          });
        })
        .catch((err) => {
          logger.error(err);
          res.status(400).json({data: false});
        });
  } catch (err) {
    logger.error(`postAuth: ${err}`);
    res.status(400).json({data: false});
  }
}

/**
 * Password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 * @property {string} req.body.password - The bearer token.
 */
function postUpdatePassword(req, res) {
  try {
    const plaintextPassword = req.body.password;
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((data) => {
          bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
            if (!err) {
              const password = hash;
              const email = data.email;
              const newData = {password};
              const query = {email};
              userModel.findOneAndUpdate(
                  query, newData, {upsert: true}, (err, doc) => {
                    if (!err) {
                      res.status(200).json({data: true});
                    } else {
                      res.status(400).json({data: false});
                    }
                  });
            }
          });
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'user post password failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 * @property {string} req.body.password - The bearer token.
 */
function postPassword(req, res) {
  try {
    const plaintextPassword = req.body.password;
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((data) => {
          bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
            if (!err) {
              const password = hash;
              const email = data.email;
              const newData = {password};
              const query = {email};
              jwt.existingActiveJwt(email, token)
                  .then((record) => {
                    if (record) {
                      userModel.findOneAndUpdate(
                          query, newData, {upsert: true}, (err, doc) => {
                            if (!err) {
                              res.status(200).json({data: true});
                            } else {
                              logger.error(
                                  'error updating password for %s', email);
                              res.status(400).json({data: false});
                            }
                          });
                    } else {
                      logger.error('no jwt record for %s', email);
                      res.status(400).json({data: false});
                    }
                  })
                  .catch((err) =>{
                    logger.error('error parsing jwt for %s', email);
                    res.status(400).json({data: false});
                  });
            }
          });
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'user post password failed';
    res.status(400).json({data: false, error});
  }
}

/**
* Profile
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 * @property {string} req.body.name_first - The users first name.
 * @property {string} req.body.name_last - The users last name.
 * @property {string} req.body.address_country - The users country.
 * @property {string} req.body.date_birth_day - The users dob day.
 * @property {string} req.body.date_birth_month - The users dob month.
 * @property {string} req.body.date_birth_year - The users dob year.
 * @property {string} req.body.gender - The users gender.
 */
function postProfile(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          if (jwtdata.onfido_status === 'default' ||
          jwtdata.onfido_status === 'started') {
            const onfidoStatus = 'started';
            const onfidoId = jwtdata.onfido_id;
            const email = jwtdata.email;
            const nameFirst = req.body.name_first;
            const nameLast = req.body.name_last;
            const addressCountry = req.body.address_country;
            const dateBirthDay = req.body.date_birth_day;
            const dateBirthMonth = req.body.date_birth_month;
            const dateBirthYear = req.body.date_birth_year;
            const gender = req.body.gender;
            const query = {email};
            const newData = {
              name_first: nameFirst,
              name_last: nameLast,
              address_country: addressCountry,
              date_birth_day: dateBirthDay,
              date_birth_month: dateBirthMonth,
              date_birth_year: dateBirthYear,
              gender,
              onfido_status: onfidoStatus,
            };
            userModel.findOneAndUpdate(query, newData, {upsert: true},
                (err, doc) => {
                  if (!err) {
                    onfido.updateApplicant(newData, onfidoId)
                        .then(()=>{
                          const newjwt = jwt.jwtSign({
                            email,
                            onfido_status: onfidoStatus,
                            onfido_id: onfidoId,
                          });
                          logger.info(`onfido profile updated for ${email}`);
                          res.status(200).json({data: true, newjwt});
                        })
                        .catch((err) => {
                          logger.error(`failed onfido 
                          update for ${email}: ${err}`);
                          res.status(400).json({data: false});
                        });
                  } else {
                    logger.error(`failed database update for ${email}: ${err}`);
                    res.status(400).json({data: false});
                  }
                });
          }
        })
        .catch((err) => {
          logger.error(`token decode failed: ${err}`);
          res.status(400).json({data: false});
        });
  } catch (err) {
    logger.error(`postProfile failed: ${err}`);
    res.status(400).json({data: false});
  }
}

/**
 * Password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getProfile(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const email = jwtdata.email;
          userModel.find({email}, (err, data) => {
            if (!err && data && data[0]) {
              const profile = data[0];
              onfido.checkImages(profile.onfido_id)
                  .then((imageCount) => {
                    profile.password = '';
                    profile.onfido_id = '';
                    res.status(200).json({
                      data: true,
                      profile: profile,
                      image_count: imageCount,
                    });
                  });
            } else {
              res.status(400).json({data: false});
            }
          });
        })
        .catch((err) => {
          console.log(err); // eslint-disable-line no-console
        });
  } catch (err) {
    const error = 'user get profile failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Account
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 * @property {string} req.headers.public_key_owner - The owners public key.
 * @property {string} req.headers.public_key_active - The active public key.
 * @property {string} req.headers.worbli_account_name - The worbli account name.
 */
function postAccount(req, res) {
  try {
    const worbliAccountName = req.body.worbli_account_name;
    const publicKeyActive = req.body.public_key_active;
    const publicKeyOwner = req.body.public_key_owner;
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    let jwtData;
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const onfidoId = jwtdata.onfido_id;
          const email = jwtdata.email;
          const newAccount = {
            worbli_account_name: worbliAccountName,
            public_key_active: publicKeyActive,
            public_key_owner: publicKeyOwner,
            email,
          };
          const onfidoStatus = jwtdata.onfido_status;
          jwtData = jwtdata;
          if (onfidoStatus === 'approved') {
            userModel.find({email}, (err, data) => {
              if (!err && data && data[0].worbli_account_name) {
                res.status(400).json({
                  data: false,
                  error: `You have already claimed the name:
                  ${data[0].worbli_account_name}`,
                });
              } else {
                account.checkExists(worbliAccountName)
                    .then((exists) => {
                      if (exists === true || exists === undefined) {
                        res.status(400).json({
                          data: false,
                          error: 'Name already exists',
                        });
                      } else {
                        const email = jwtData.email;
                        const onfidoStatus = 'named';
                        const newData = {
                          worbli_account_name: worbliAccountName,
                          onfido_status: onfidoStatus,
                        };
                        const query = {email};
                        userModel.findOneAndUpdate(
                            query,
                            newData,
                            {upsert: true},
                            (err, doc) => {
                              if (!err) {
                                account.createAccount(newAccount);
                                const newjwt = jwt.jwtSign({
                                  email,
                                  onfido_status: onfidoStatus,
                                  onfido_id: onfidoId,
                                });
                                res.status(200).json({data: true, newjwt});
                              } else {
                                const logerror = 'could not findOneAndUpdate in function postAccount in users.js'; // eslint-disable-line
                                res.status(400).json({data: false, logerror});
                              }
                            });
                      }
                    })
                    .catch((err) => {
                      const logerror = 'could not checkExists in function postAccount in users.js'; // eslint-disable-line
                      res.status(400).json({data: false, logerror});
                    });
              }
            });
          } else {
            res.status(400).json({data: false, error: 'You must complete KYC'});
          }
        });
  } catch (err) {
    const error = 'user post account failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Snapshot
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.query.account - The bearer token.
 */
function getSnapshot(req, res) {
  try {
    const snapShot = req.query.account;
    snapShotModel.find({account_name: snapShot}, (err, data) => {
      if (data[0] && data[0].account_name) {
        return res.send(data[0]);
      } else {
        return res.send(false);
      }
    });
  } catch (err) {
    const error = 'user post snapshot failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Security
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getSecurity(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const email = jwtdata.email;
          userModel.find({email}, (err, data) => {
            if (!err && data && data[0] && data[0].security_code) {
              const securityCode = data[0].security_code;
              res.status(200).json({data: true, security_code: securityCode});
            }
          });
        });
  } catch (err) {
    const error = 'user get security failed';
    res.status(400).json({data: false, error});
  }
}

const _getUser = function(email) {
  return new Promise(function(resolve, reject) {
    userModel.findOne({email: email})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        });
  });
};

const _updateUser = function(email) {
  return new Promise(function(resolve, reject) {
    const onfidoStatus = 'credited';
    const newData = {
      onfido_status: onfidoStatus,
    };
    userModel.findOneAndUpdate({email}, newData, {upsert: true})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        });
  });
};


const _getSharegrabRequest = function(worbliAccountName, email) {
  return new Promise(function(resolve, reject) {
    sharegrabRequestModel.findOne({worbli_account_name: worbliAccountName})
        .exec(function(err, share) {
          if (err) {
            reject(err);
          } else {
            if (share && share.state === 'success') {
              resolve(share);
            } else {
              reject(`succesful sharegrab request 
              not found for ${worbliAccountName} ${email}`);
            }
          }
        });
  });
};


/**
 * Security
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getSharedrop(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token).then((jwtdata) => {
      const onfidoId = jwtdata.onfido_id;
      const email = jwtdata.email;
      _getUser(email).then((user) => {
        return _getSharegrabRequest(user.worbli_account_name, email);
      }).then((share) => {
        return _updateUser(share.worbli_account_name);
      }).then((user) => {
        const newjwt = jwt.jwtSign({
          email,
          onfido_status: 'credited',
          onfido_id: onfidoId,
        });
        logger.info(`getNameSharedrop: updated user ${email} to credited`);
        res.status(200).json({data: true, newjwt});
      }).catch((err) => {
        logger.error(`getNameSharedrop: ${err}`);
        res.status(400).json({data: false});
      });
    });
  } catch (err) {
    logger.error(`getNameSharedrop: ${err}`);
    res.status(400).json({data: false});
  }
}

/**
 * Security
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function getName(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const email = jwtdata.email;
          userModel.find({email}, (err, data) => {
            if (!err && data && data[0] && data[0].worbli_account_name) {
              const worbliAccountName = data[0].worbli_account_name;
              logger.info(`getName: found user ${email} 
              account name ${worbliAccountName}`);
              res.status(200).json({
                data: true,
                worbli_account_name: worbliAccountName,
              });
            }
          });
        })
        .catch((err) => {
          logger.error(`getName error: ${err}`);
          res.status(400).json({data: false, error: err});
        });
  } catch (err) {
    logger.error(`getName error: ${err}`);
    res.status(400).json({data: false});
  }
}

module.exports = {
  postLogin,
  postAuth,
  postProfile,
  getProfile,
  postAccount,
  getSnapshot,
  postUpdatePassword,
  postPassword,
  getSecurity,
  getSharedrop,
  getName,
};
