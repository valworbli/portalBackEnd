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
        const mongo_id = data[0]._id;
        const email = data[0].email;
        const onfido_status = data[0].onfido_status;
        const onfido_id = data[0].onfido_id || null;
        const security_code = data[0].security_code || null;
        bcrypt.compare(plaintextPassword, hash, function(err, data) {
          if (data === true) {
            const token = jwt.jwtExpires({
              email, onfido_status, onfido_id, security_code}, '72h');
            res.status(200).json({data: true, token, onfido_status});
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
 * Login
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
          const onfido_status = data.onfido_status;
          const security_code = data.security_code;
          res.status(200).json({data: true, onfido_status, security_code});
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
* Profile
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 * @property {string} req.body.name_first - The users first name.
 * @property {string} req.body.name_middle - The users middle name.
 * @property {string} req.body.name_last - The users last name.
 * @property {string} req.body.address_country - The users country.
 * @property {string} req.body.address_zip - The users zip.
 * @property {string} req.body.address_town - The users town.
 * @property {string} req.body.address_flat_number - The users flat number.
 * @property {string} req.body.address_building_name - The users building name.
 * @property {string} req.body.address_building_number - The users building number.
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
            const onfido_status = 'started';
            const onfido_id = jwtdata.onfido_id;
            const email = jwtdata.email;
            const name_first = req.body.name_first;
            const name_middle = req.body.name_middle;
            const name_last = req.body.name_last;
            const address_country = req.body.address_country;
            const address_zip = req.body.address_zip;
            const address_town = req.body.address_town;
            const address_flat_number = req.body.address_flat_number || '';
            const address_building_name = req.body.address_building_name || '';
            const address_building_number = req.body.address_building_number || '';
            const address_one = req.body.address_one || '';
            const address_two = req.body.address_two || '';
            const address_state = req.body.address_state || '';
            const phone_code = req.body.phone_code;
            const phone_mobile = req.body.phone_mobile;
            const date_birth_day = req.body.date_birth_day;
            const date_birth_month = req.body.date_birth_month;
            const date_birth_year = req.body.date_birth_year;
            const gender = req.body.gender;
            const query = {email};
            const newData = {
              name_first,
              name_middle,
              name_last,
              address_country,
              address_zip,
              address_town,
              address_flat_number,
              address_building_name,
              address_building_number,
              address_one,
              address_two,
              address_state,
              phone_code,
              phone_mobile,
              date_birth_day,
              date_birth_month,
              date_birth_year,
              gender,
              onfido_status,
            };
            userModel.findOneAndUpdate(query, newData, {upsert: true},
                (err, doc) => {
                  if (!err) {
                    onfido.updateApplicant(newData, onfido_id)
                        .then(()=>{
                          const newjwt = jwt.jwtSign({
                            email, onfido_status,
                            onfido_id,
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
                    const image_count = imageCount;
                    res.status(200).json({data: true, profile: profile, image_count});
                  });
            } else {
              res.status(400).json({data: false});
            }
          });
        })
        .catch((err) => {
            console.log(err);
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
    const worbli_account_name = req.body.worbli_account_name;
    const public_key_active = req.body.public_key_active;
    const public_key_owner = req.body.public_key_owner;
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    let jwtData;
    jwt.jwtDecode(token)
        .then((jwtdata) => {
          const onfido_id = jwtdata.onfido_id;
          const email = jwtdata.email;
          const newAccount = {worbli_account_name, public_key_active, public_key_owner, email};
          const onfido_status = jwtdata.onfido_status;
          jwtData = jwtdata;
          if (onfido_status === 'approved') {
            userModel.find({email}, (err, data) => {
              if (!err && data && data[0].worbli_account_name) {
                res.status(400).json({data: false, error: `You have already claimed the name: ${data[0].worbli_account_name}`});
              } else {
                account.checkExists(worbli_account_name)
                    .then((exists) => {
                      if (exists === true || exists === undefined) {
                        res.status(400).json({data: false, error: 'Name already exists'});
                      } else {
                        const email = jwtData.email;
                        const onfido_status = 'named';
                        const newData = {worbli_account_name, onfido_status};
                        const query = {email};
                        userModel.findOneAndUpdate(query, newData, {upsert: true}, (err, doc) => {
                          if (!err) {
                            account.createAccount(newAccount);
                            const newjwt = jwt.jwtSign({email, onfido_status, onfido_id});
                            res.status(200).json({data: true, newjwt});
                          } else {
                            res.status(400).json({data: false});
                          }
                        });
                      }
                    })
                    .catch((err) => {
                      res.status(400).json({data: false});
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
    const snap_shot = req.query.account;
    snapShotModel.find({account_name: snap_shot}, (err, data) => {
      if (data[0] && data[0].account_name) {
        return res.send(data[0]);
      } else {
        return res.send(false);
      }
    });
  } catch (err) {
    const error = 'user post snapshot failed';
    res.status(400).json({data: false, error})
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
              const security_code = data[0].security_code;
              res.status(200).json({data: true, security_code});
            }
          });
        });
  } catch (err) {
    const error = 'user get security failed';
    res.status(400).json({data: false, error})
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
          const onfido_id = jwtdata.onfido_id;
          const email = jwtdata.email;
          userModel.find({email}, (err, data) => {
            const worbli_account_name = data[0].worbli_account_name;
            sharegrabRequestModel.find({worbli_account_name}, (err, data) => {
              if (!err && data && data[0] && data[0].state === 'success') {
                const onfido_status = 'credited';
                const newData = {onfido_status};
                const query = {email};
                userModel.findOneAndUpdate(query, newData, {upsert: true},
                    (err, doc) => {
                      if (!err) {
                        const newjwt = jwt.jwtSign(
                            {email, onfido_status, onfido_id});
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
              const worbli_account_name = data[0].worbli_account_name;
              res.status(200).json({data: true, worbli_account_name});
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
  postPassword,
  getSecurity,
  getSharedrop,
  getName,
};
