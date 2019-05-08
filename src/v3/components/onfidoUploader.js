/* eslint max-len: 0 */
const fs = require('fs');
const Const = require('../defs/const.js');
const logger = require('./logger')(module);
const ofWrapper = require('../components/onfidoWrapper');
const asyncForEach = require('./asyncFunctions').asyncForEach;
const utils = require('./utils');

module.exports = function(options) {
  return function uploadToOnFido(req, res, next) {
    try {
      let count = 0;

      if (!req.files) {
        logger.error('OnFido uploader: no files are present, skipping...');
        return next();
      }

      asyncForEach(req.files, async (element) => {
        await (async () => {
          const {user} = req.worbliUser;
          const {docName} = utils.extractNames(element.fieldname);

          const fName = '/tmp/' + user.onfido.onfido_id + element.fieldname + '.jpg';
          fs.writeFileSync(fName, element.buffer);

          const image = fs.createReadStream(fName);
          let docType = undefined;
          let side = Const.ONFIDO_FRONT;

          if (docName.endsWith(Const.ID_REVERSE_SUFFIX)) {
            docType = docName.substring(0, docName.length - Const.ID_REVERSE_SUFFIX.length - 1);
            side = Const.ONFIDO_BACK;
          } else {
            docType = docName;
          }

          let func = undefined;
          let printName = 'SELFIE';

          if (docType === Const.ID_SELFIE) {
            func = ofWrapper.uploadLivePhoto(user.onfido.onfido_id, image);
          } else {
            if (docType === 'driving_license') {
              func = ofWrapper.uploadDocument(user.onfido.onfido_id, 'driving_licence', image, {side});
            } else {
              func = ofWrapper.uploadDocument(user.onfido.onfido_id, docType, image, {side});
            }
            printName = 'DOCUMENT';
          }

          func.then(function(doc) {
            logger.info('SUCCESSFULLY uploaded a ' + printName + ' with id:' + JSON.stringify(doc.id));
            if (options.markFailed) element.failed = false;
          }).catch(function(err) {
            logger.error('ERROR uploading the ' + printName + ': ' + JSON.stringify(err));
            if (options.markFailed) {
              element.failed = true;
              element.errorStatus = err.status;
            }
          }).finally(() => {
            fs.unlinkSync(fName);
            count += 1;
            if (count === req.files.length) {
              next();
            }
          });
        })();
      });
    } catch (err) {
      logger.error('Error uploading the images to OnFido: ' + JSON.stringify(err));
      next();
    }
  };
};
