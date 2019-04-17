const jwt = require('../jwt');
const Users = require('../../models/schemas/users');

module.exports = (socket, next) => {
  const token = socket.handshake.query['token'];
  const jwtToken = jwt.jwtDecode(token);
  if (!jwtToken) {
    next(new Error('Unauthorized'));
  } else {
    Users.findOne({email: jwtToken.email}, function(err, user) {
      if (err) {
        next(new Error('Unauthorized'));
      } else {
        if (!user) {
          next(new Error('Unauthorized'));
        } else {
          socket.request.user = user;
          next();
        }
      }
    });
  }
};
