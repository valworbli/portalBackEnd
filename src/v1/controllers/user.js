const userModel = require('../models/user.js');
const sharegrabRequestModel = require('../models/sharegrabRequest.js');
const snapShotModel = require('../models/snapShot.js');
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
          res.status(200).json({
            data: true,
            onfido_status: onfidoStatus,
            security_code: securityCode,
          });
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'user post auth failed';
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
                              res.status(400).json({data: false});
                            }
                          });
                    } else {
                      res.status(400).json({data: false});
                    }
                  })
                  .catch((err) =>{
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
 * @property {string} req.body.Mme_middle - The users middle name.
 * @property {string} req.body.name_last - The users last name.
 * @property {string} req.body.address_country - The users country.
 * @property {string} req.body.address_zip - The users zip.
 * @property {string} req.body.address_town - The users town.
 * @property {string} req.body.address_flat_number - The users flat number.
 * @property {string} req.body.address_building_name - The users building name.
 * @property {string} req.body.address_building_number - building number.
 * @property {string} req.body.address_one - The users address line one.
 * @property {string} req.body.address_two - The users address line two.
 * @property {string} req.body.address_state - The users address state.
 * @property {string} req.body.phone_code - The users country dialing code.
 * @property {string} req.body.phone_mobile - The users mobile phone number.
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
            const nameMiddle = req.body.Mme_middle;
            const nameLast = req.body.name_last;
            const addressCountry = req.body.address_country;
            const addressZip = req.body.address_zip;
            const addressTown = req.body.address_town;
            const addressFlatNumber = req.body.address_flat_number || '';
            const addressBuildingName = req.body.address_building_name || '';
            const addressBuildingNumber = req.body.address_building_number ||
            '';
            const addressOne = req.body.address_one || '';
            const addressTwo = req.body.address_two || '';
            const addressState = req.body.address_state || '';
            const phoneCode = req.body.phone_code;
            const phoneMobile = req.body.phone_mobile;
            const dateBirthDay = req.body.date_birth_day;
            const dateBirthMonth = req.body.date_birth_month;
            const dateBirthYear = req.body.date_birth_year;
            const gender = req.body.gender;
            const query = {email};
            const newData = {
              name_first: nameFirst,
              Mme_middle: nameMiddle,
              name_last: nameLast,
              address_country: addressCountry,
              address_zip: addressZip,
              address_town: addressTown,
              address_flat_number: addressFlatNumber,
              address_building_name: addressBuildingName,
              address_building_number: addressBuildingNumber,
              address_one: addressOne,
              address_two: addressTwo,
              address_state: addressState,
              phone_code: phoneCode,
              phone_mobile: phoneMobile,
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
                          res.status(200).json({data: true, newjwt});
                        })
                        .catch(()=>{
                          res.status(400).json({data: false});
                        });
                  } else {
                    res.status(400).json({data: false});
                  }
                });
          }
        })
        .catch((jwtdata) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'user post profile failed';
    res.status(400).json({data: false, error});
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
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const onfidoId = jwtdata.onfido_id;
          const email = jwtdata.email;
          userModel.find({email}, (err, data) => {
            const worbliAccountName = data[0].worbli_account_name;
            sharegrabRequestModel.find({worbliAccountName}, (err, data) => {
              if (!err && data && data[0] && data[0].state === 'success') {
                const onfidoStatus = 'credited';
                const newData = {
                  onfido_status: onfidoStatus,
                };
                const query = {email};
                userModel.findOneAndUpdate(query, newData, {upsert: true},
                    (err, doc) => {
                      if (!err) {
                        const newjwt = jwt.jwtSign({
                          email,
                          onfido_status: onfidoStatus,
                          onfido_id: onfidoId,
                        });
                        res.status(200).json({data: true, newjwt});
                      } else {
                        res.status(400).json({data: false});
                      }
                    });
              } else {
                res.status(400).json({data: false});
              }
            });
          });
        })
        .catch((err) => {
          res.status(400).json({data: false, error: err});
        });
  } catch (err) {
    const error = 'user get sharedrop failed';
    res.status(400).json({data: false, error});
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
              res.status(200).json({
                data: true,
                worbli_account_name: worbliAccountName,
              });
            }
          });
        })
        .catch((err) => {
          res.status(400).json({data: false, error: err});
        });
  } catch (err) {
    const error = 'user get name failed';
    res.status(400).json({data: false, error});
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
