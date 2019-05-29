/* eslint max-len: 0 */
const fs = require('fs-extra');
const Const = require('../../defs/const.js');
const logger = require('../logger')(module);
const ofWrapper = require('../onfidoWrapper');
const asyncForEach = require('../asyncFunctions').asyncForEach;
const utils = require('../utils');
const Archiver = require('../sync/Archiver');

module.exports = function(options) {
  return function uploadToOnFido(req, res, next) {
    try {
      let count = 0;

      if (!req.files) {
        logger.error('OnFido uploader: no files are present, skipping...');
        return next();
      }

      const userFolder = Const.USERDATA_FOLDER + req.worbliUser._id + '/';
      if (options.encryptFiles && !fs.existsSync(userFolder)) fs.mkdirpSync(userFolder);

      asyncForEach(req.files, async (element) => {
        await (async () => {
          const {user} = req.worbliUser;
          const {docName} = utils.extractNames(element.fieldname);
          if (options.encryptFiles) {
            const archiver = new Archiver(true, true);
            archiver.start(userFolder + user.onfido.onfido_id + element.fieldname + '.jpg.tar.gz');
            archiver.archive.append(element.buffer, {name: user.onfido.onfido_id + element.fieldname + '.jpg'});
            await archiver.stop();
          }

          const fName = '/tmp/' + user.onfido.onfido_id + '_' + element.fieldname + '.jpg';
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

          const ofStatus = {};

          func.then(function(doc) {
            logger.info('SUCCESSFULLY uploaded a ' + printName + ' with id:' + JSON.stringify(doc.id));
            ofStatus['onfido_id'] = doc.id;
            ofStatus['dump'] = JSON.stringify(doc);
            if (options.markFailed) ofStatus['failed'] = false;
          }).catch(function(err) {
            logger.error('ERROR uploading the ' + printName + ': ' + JSON.stringify(err));
            if (options.markFailed) {
              ofStatus['failed'] = true;
              ofStatus['errorStatus'] = err.status;
              ofStatus['dump'] = JSON.stringify(err);
            }
          }).finally(() => {
            fs.unlinkSync(fName);
            count += 1;
            if (count === req.files.length) {
              next();
            }
          });
          element[Const.ONFIDO] = ofStatus;
        })();
      });
    } catch (err) {
      logger.error('Error uploading the images to OnFido: ' + JSON.stringify(err));
      next();
    }
  };
};
