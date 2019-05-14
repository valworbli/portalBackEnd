/* eslint max-len: 0 */
const Const = require('../../defs/const.js');
const logger = require('../logger')(module);
const FileUploads = require('../../models/schemas/fileUploads');

module.exports = function(options = {}) {
  return function(req, res, next) {
    if (!req.files) {
      logger.info('uploadSerializer: no files are present, skipping...');
      next();
    } else {
      const fileRecords = [];
      for (const file of req.files) {
        const fu = new FileUploads({
          user: req.worbliUser._id,
          created_at: Date.now(),
          fieldname: file.fieldname,
          onfido_errored: file[Const.ONFIDO].failed,
          onfido_dump: file[Const.ONFIDO].dump,
          s3_time: file[Const.S3].ts,
          s3_filename: file[Const.S3].fileName,
          s3_dump: file[Const.S3].dump,
          s3_errored: file[Const.S3].failed,
        });

        if (!file[Const.ONFIDO].failed) {
          fu.onfido_id = file[Const.ONFIDO].onfido_id;
        }

        fileRecords.push(new Promise(function(resolve, reject) {
          fu.save(function(err, fileRec) {
            if (err) {
              reject(err);
            }
            if (!fileRec) {
              reject();
            }

            resolve(fileRec);
          });
        }).catch(function(err) {
          logger.error('ERROR saving the file record: ' + JSON.stringify(fu) + ', error: ' + JSON.stringify(err));
        }));
      }

      Promise.all(fileRecords).then(function(values) {
        for (const value of values) {
          if (value) {
            logger.info('Saved file upload ' + JSON.stringify(value.s3_filename));
          }
        }
      }).finally(function() {
        next();
      });
    }
  };
};
