/* eslint max-len: 0 */
const jwt = require('../jwt');
const Users = require('../../models/schemas/users');
const IDDocs = require('../../models/schemas/idDocs');
const socketio = require('socket.io');
const logger = require('../logger')(module);
const Const = require('../../defs/const');
const HttpStatus = require('http-status-codes');

// const authSocket = require('./authSocket');

let that = undefined;

/**
 * SocketManager
 * @param {string} server - The express app
 * @return {null} nothing
 */
function SocketManager(server) {
  if (!(this instanceof SocketManager)) {
    // the constructor was called without "new".
    return new SocketManager(server);
  }

  that = this;
  this.ioServer = socketio(server, {
    path: `${process.env.SOCKET_PATH}`,
    pingInterval: 20000,
    pingTimeout: 10000,
  });

  logger.info(`SocketManager(): listening on ${process.env.SOCKET_PATH}`);
  // this.ioServer.use(authSocket);

  this.ioServer.on('connection', function(socket) {
    logger.info('Client connected from ' + JSON.stringify(socket.handshake.address));
    that.authenticate(socket, function(err, user) {
      if (err) {
        socket.emit(Const.SOCKET_ON_CONNECT, user);
      } else {
        that.initRoutes(socket);
        that.getUserState(socket, {});
        that.getMissingDocuments(socket, {});
      }
    });
  });
}

SocketManager.prototype.initRoutes = function(socket) {
  socket.on('disconnect', function(reason) {
    logger.info('Client ' + JSON.stringify(socket.request.user._id) +
      ' DISCONNECTED from ' + JSON.stringify(socket.handshake.address) +
      ', reason: ' + JSON.stringify(reason));
  });
  socket.on(Const.SOCKET_TEST_MESSAGE, function(data) {
    socket.emit(Const.SOCKET_TEST_MESSAGE, data);
  });
  socket.on(Const.SOCKET_USER_GET_STATE, function(data) {
    logger.info('SOCKET_USER_GET_STATE');
    that.getUserState(socket, data);
  });
  socket.on(Const.SOCKET_MISSING_IMAGES, function(data) {
    logger.info('SOCKET_MISSING_IMAGES');
    that.getMissingDocuments(socket, data);
  });
};

SocketManager.prototype.authenticate = function(socket, cb=null) {
  const token = socket.handshake.query['jwt'];
  const jwtToken = jwt.jwtDecode(token);
  if (!jwtToken) {
    logger.error('authenticate: Missing token!');
    if (cb) return cb(true, {data: false, status: HttpStatus.UNAUTHORIZED, error: 'Missing token'});
  } else {
    Users.findOne({email: jwtToken.email}, function(err, user) {
      if (err) {
        logger.error('authenticate: err: ' + JSON.stringify(err));
        if (cb) return cb(true, {data: false, status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Internal service failure, please retry later.'});
      } else {
        if (!user) {
          logger.error('authenticate: No such user!');
          if (cb) return cb(true, {data: false, status: HttpStatus.UNAUTHORIZED, error: 'No such user'});
        } else {
          socket.request.user = user;
          logger.info('authenticate: user found: ' + JSON.stringify(user._id));
          if (cb) return cb(false, user);
        }
      }
    });
  }
};

/**
 * Internal _getMissingImages
 * @param {object} socket - The socket of the user
 * @param {object} data - The request data (unused for the moment)
 */
SocketManager.prototype.getMissingDocuments = function(socket, data) {
  const {user} = socket.request;
  Users.findOne({_id: user._id}, function(err, user) {
    if (err) {
      socket.emit(Const.SOCKET_MISSING_IMAGES, {data: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal service error, please try again later.',
      });
    } else {
      if (!user) {
        socket.emit(Const.SOCKET_MISSING_IMAGES, {data: false,
          status: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized!',
        });
      } else {
        if (!user.identity_images) {
          socket.emit(Const.SOCKET_MISSING_IMAGES, {
            completed: false,
            missingDocuments: ['selfie', 'identity'],
            data: true,
          });
        } else {
          const countryPrefix = user.identity_images.country;
          IDDocs.findOne({code: countryPrefix}, function(err, countryInfo) {
            if (!countryInfo) {
              socket.emit(Const.SOCKET_MISSING_IMAGES, {data: false,
                status: HttpStatus.BAD_REQUEST,
                error: 'Malformed request submitted!',
              });
            } else {
              const result = user.identity_images.verify(countryInfo.accepted[0]);
              if (result.error) {
                socket.emit(Const.SOCKET_MISSING_IMAGES, {data: false,
                  status: HttpStatus.BAD_REQUEST,
                  error: 'Malformed request submitted!',
                });
              } else {
                socket.emit(Const.SOCKET_MISSING_IMAGES, {data: true,
                  completed: result.missingDocuments.length === 0,
                  missingDocuments: result.missingDocuments,
                });
              }
            }
          });
        }
      }
    }
  });
};

SocketManager.prototype.getUserState = function(socket, data) {
  const {user} = socket.request;
  Users.findOne({_id: user._id}, function(err, user) {
    if (err) {
      socket.emit(Const.SOCKET_USER_GET_STATE, {data: false, status: HttpStatus.INTERNAL_SERVER_ERROR});
    } else {
      if (!user) {
        socket.emit(Const.SOCKET_USER_GET_STATE, {data: false, status: HttpStatus.UNAUTHORIZED});
      } else {
        const ofStatus = user.getOnFidoStatus();
        ofStatus['worbliAccountName'] = user.worbli_account_name ? user.worbli_account_name: '';
        socket.emit(Const.SOCKET_USER_GET_STATE, {
          status: ofStatus,
          data: true,
        });
      }
    }
  });
};

module.exports = SocketManager;
