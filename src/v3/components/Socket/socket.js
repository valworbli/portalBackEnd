/* eslint max-len: 0 */
/* eslint guard-for-in: 0 */

const jwt = require('../jwt');
const Users = require('../../models/schemas/users');
const socketio = require('socket.io');
const logger = require('../logger')(module);
const Const = require('../../defs/const');
const HttpStatus = require('http-status-codes');
const utils = require('../utils');

// const authSocket = require('./authSocket');

let that = undefined;

/**
 * SocketManager
 * @param {string} server - The express app
 * @return {null} nothing...
 */
function SocketManager(server) {
  if (!(this instanceof SocketManager)) {
    // the constructor was called without "new".
    return new SocketManager(server);
  }

  if (process.env.TRAVIS) {
    logger.error('Running the SocketManager under TRAVIS is not supported!');
    return;
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
    logger.info('Client connected from ' +
      JSON.stringify(socket.handshake.headers['x-real-ip'] || socket.handshake.address));
    that.authenticate(socket, function(err, user) {
      if (err) {
        socket.emit(Const.SOCKET_ON_CONNECT, user);
        socket.disconnect(true);
      } else {
        that.initRoutes(socket);
        that.getImageStatus(socket, user);
        logger.info(`Emitted INITIAL ${Const.SOCKET_MISSING_IMAGES} to user ${user._id}`);
        that.getUserState(socket, user);
        logger.info('Emitted INITIAL user state to user ' + user._id);
      }
    });
  });

  try {
    this.dbWatcher();
  } catch (err) {
    logger.info('Error spawning the dbWatcher: ' + JSON.stringify(err));
  }
}

SocketManager.prototype.dbWatcher = function() {
  let updatedFields = undefined;
  let found = false;
  let keys = undefined;

  const changeStreams = Users.watch();
  changeStreams.on('change', function(change) {
    logger.info('DB WATCH: ' + JSON.stringify(change));
    found = false;
    switch (change.operationType) {
      case 'replace':
        found = that.notifyUser(change.documentKey._id);
        break;
      case 'update':
        updatedFields = change.updateDescription.updatedFields;
        keys = Object.keys(updatedFields);
        that.checkUpdatedFields(keys, function(key) {
          found = that.notifyUser(change.documentKey._id);
        });
        break;
      default:
        break;
    }

    if (!found) logger.info('No connected socket found for user ' + change.documentKey._id);
  });
};

/** notifyUser
 * @param {object} id - the user's DB id
 * @return {bool} found - whether any sockets have been found for the user
 */
SocketManager.prototype.notifyUser = function(id) {
  const printID = JSON.stringify(id);
  let found = false;

  that.findSockets(printID, async function(sockets) {
    logger.info('findSockets returned ' + sockets.length + ' sockets for user ' + printID);
    if (sockets.length < 1) {
      return false;
    }

    found = sockets.length > 0;

    const user = await that.getUser(id);
    for (const sock of sockets) {
      that.getImageStatus(sock, user);
      logger.info(`Emitted ${Const.SOCKET_MISSING_IMAGES} to user ${printID}`);
      that.getUserState(sock, user);
      logger.info('Emitted user state to user ' + printID);
    }
  });

  return found;
};

SocketManager.prototype.initRoutes = function(socket) {
  socket.on('disconnect', function(reason) {
    logger.info('Client ' + JSON.stringify(socket.worbliUser._id) +
      ' DISCONNECTED from ' + JSON.stringify(socket.handshake.headers['x-real-ip'] || socket.handshake.address) +
      ', reason: ' + JSON.stringify(reason));
  });
  socket.on(Const.SOCKET_TEST_MESSAGE, function(data) {
    socket.emit(Const.SOCKET_TEST_MESSAGE, data);
  });
  socket.on(Const.SOCKET_USER_GET_STATE, async function(data) {
    logger.info('SOCKET_USER_GET_STATE');
    const user = await that.getUser(socket.worbliUser._id);
    that.getUserState(socket, user);
  });
  socket.on(Const.SOCKET_MISSING_IMAGES, async function(data) {
    logger.info('SOCKET_MISSING_IMAGES');
    const user = await that.getUser(socket.worbliUser._id);
    that.getImageStatus(socket, user);
  });
};

SocketManager.prototype.authenticate = function(socket, cb=null) {
  const token = socket.handshake.query['jwt'];
  if (!token) {
    logger.error('authenticate: Missing token!');
    if (cb) return cb(true, {data: false, status: HttpStatus.UNAUTHORIZED, error: 'missing token'});
  }

  const jwtToken = jwt.jwtDecode(token);
  if (!jwtToken) {
    logger.error('authenticate: Invalid token!');
    if (cb) return cb(true, {data: false, status: HttpStatus.UNAUTHORIZED, error: 'invalid token'});
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
          socket.worbliUser = {_id: user._id, email: user.email};
          logger.info('authenticate: user found: ' + JSON.stringify(socket.worbliUser.email));
          if (cb) return cb(false, user);
        }
      }
    });
  }
};

SocketManager.prototype.getUserState = function(socket, user) {
  if (!user) {
    logger.error('getUserState: no user provided, ERRORING out...');
    socket.emit(Const.SOCKET_USER_GET_STATE, {data: false, status: HttpStatus.UNAUTHORIZED});
  } else {
    const ofStatus = user.getOnFidoStatus();
    ofStatus['worbliAccountName'] = user.worbli_account_name ? user.worbli_account_name: '';
    logger.info('getUserState: emitting back ' + JSON.stringify(ofStatus));
    socket.emit(Const.SOCKET_USER_GET_STATE, {
      status: ofStatus,
      data: true,
    });
  }
};

/**
 * internal getUser
 * @param {object} userID - the user's socket
 */
SocketManager.prototype.getUser = async function(userID) {
  const user = await new Promise((resolve, reject) => {
    Users.findOne({_id: userID}, function(err, user) {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  }).catch(function(err) {
    logger.error('getUser error: ' + JSON.stringify(err));
    // socket.emit(Const.SOCKET_MISSING_IMAGES, {data: false, status: HttpStatus.INTERNAL_SERVER_ERROR});
  });

  if (user) logger.info('getUser: found user with id ' + JSON.stringify(user._id) + ' and email ' + JSON.stringify(user.email));
  return user;
};

SocketManager.prototype.getImageStatus = function(socket, user=undefined) {
  const result = utils.getImageStatus(user);
  socket.emit(Const.SOCKET_MISSING_IMAGES, result);
};

/**
 * Internal findSocket
 * @param {string} userID - The user ID against which to match a socket
 * @param {string} cb - The callback
 * @return {Object} socket - The socket of the user
 */
SocketManager.prototype.findSocket = function(userID, cb=null) {
  const sockets = that.ioServer.sockets.sockets;
  for (const socket in sockets) {
    if (sockets[socket] && sockets[socket].worbliUser && JSON.stringify(sockets[socket].worbliUser._id) === userID) {
      if (cb) (cb(sockets[socket]));
      else return sockets[socket];
    }
  }
};

/**
 * Internal findSockets
 * @param {string} userID - The user ID against which to match a socket
 * @param {string} cb - The callback
 * @return {Object} socket - The socket of the user
 */
SocketManager.prototype.findSockets = function(userID, cb=null) {
  const sockets = that.ioServer.sockets.sockets;
  const userSockets = [];
  for (const socket in sockets) {
    if (sockets[socket] && sockets[socket].worbliUser && JSON.stringify(sockets[socket].worbliUser._id) === userID) {
      userSockets.push(sockets[socket]);
    }
  }

  if (cb) (cb(userSockets));
  else return userSockets;
};

/**
 * Internal checkUpdatedFields
 * @param {string} keys - The fields to check
 * @param {string} cb - The callback
 * @return {string} the first field that matches the criteria - The socket of the user
 */
SocketManager.prototype.checkUpdatedFields = function(keys, cb=null) {
  for (const key of keys) {
    if (key.startsWith('identity_images') ||
        key.startsWith('worbli_account_name') ||
        key.startsWith('onfido') ||
        key.startsWith('updated_at') ||
        key.startsWith('shortcodeData')) {
      if (cb) {
        (cb(key));
        break;
      } else {
        return key;
      }
    }
  }
};

module.exports = SocketManager;
