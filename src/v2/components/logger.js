const {createLogger, format, transports, Logger} = require('winston');
const {combine, timestamp, label, printf} = format;
const path = require('path');

// Return the last folder name in the path and the calling
// module's filename.
const getLabel = function(callingModule) {
  const parts = callingModule.filename.split(path.sep);
  return path.join(parts[parts.length - 2], parts.pop());
};

module.exports = function(callingModule) {
  return new Logger({
    format: combine(
        label({label: module.parent.filename}),
        timestamp(),
        format.splat(),
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.colorize(),
        format.json(),
        printf((info) => {
          return `${info.timestamp} [${info.label}] 
          ${info.level}: ${info.message}`;
        })
    ),
    transports: [new transports.Console({
      label: getLabel(callingModule),
    })],
  });
};

module.exports = function(callingModule) {
  return createLogger({
    format: combine(
        label({label: getLabel(callingModule)}),
        timestamp(),
        format.splat(),
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.colorize(),
        format.json(),
        printf((info) => {
          return `${info.timestamp} [${info.label}] 
          ${info.level}: ${info.message}`;
        })
    ),
    transports: [new transports.Console()],
  });
};

