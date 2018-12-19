const adminUserModel = require('../models/adminUser.js');
const jwt = require('../components/jwt.js');
const bcrypt = require('bcrypt');

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
    adminUserModel.find({email}, (err, data) => {
      if (!err && data && data[0] && data[0].password) {
        const hash = data[0].password;
        const email = data[0].email;
        const level = data[0].level;
        bcrypt.compare(plaintextPassword, hash, function(err, data) {
          if (data === true) {
            const token = jwt.jwtExpires({
              email, level,
            }, '72h');
            res.status(200).json({
              data: true,
              token,
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
    const error = 'admin user post login failed';
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
          const level = data.level;
          if (level === 'admin') {
            res.status(200).json({
              data: true,
              level,
            });
          } else {
            res.status(400).json({data: false});
          }
        })
        .catch((err) => {
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'user post auth failed';
    res.status(400).json({data: false, error});
  }
}

module.exports = {
  postLogin,
  postAuth,
};
