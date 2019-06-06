/* eslint max-len: 0 */
const Const = require('../defs/const');
const HttpStatus = require('http-status-codes');
const logger = require('./logger')(module);

/**
 * extractNames
 * @param {object} fieldname - The fieldname to be split
 * @return {object} - the extracted deviceId, countryPrefix, docName, offset
 */
function extractNames(fieldname) {
  let countryPrefix = undefined;
  let deviceId = undefined;
  let docName = undefined;
  let offset = 0;

  const splitParts = fieldname.split('_');
  // get the device ID from the fieldname
  deviceId = parseInt(splitParts[0]);
  if (isNaN(deviceId)) {
    countryPrefix = splitParts[0];
    deviceId = 0;
  } else {
    // get the country from the uploaded file.fieldname
    countryPrefix = splitParts[1];
    offset = splitParts[0].length + 1;
  }

  offset += countryPrefix.length + 1;
  docName = fieldname.substring(offset);

  return {deviceId, countryPrefix, docName, offset};
}

/**
 * getImageStatus
 * @param {object} user - The user DB record
 * @return {object} - the imageStatus object to be sent to the user
 */
function getImageStatus(user) {
  if (!user) {
    logger.warn('getImageStatus: user is undefined!');
    return {data: false, status: HttpStatus.UNAUTHORIZED};
  } else {
    if (!user.shortcodeData || !user.shortcodeData.files || !user.shortcodeData.country) {
      logger.warn('getImageStatus: user\'s shortcodeData is undefined!');
      return {data: true, status: HttpStatus.OK, completed: false, files: [], country: ''};
    } else {
      const sFiles = user.shortcodeData.files.replace(/'/g, '"');
      const filesArray = JSON.parse(sFiles);
      let bSelfieFound = false; let completed = true;

      for (const file of filesArray) {
        if (file.value === Const.ID_SELFIE) {
          bSelfieFound = true;
          break;
        }
      }

      if (!bSelfieFound) {
        filesArray.push({value: Const.ID_SELFIE, label: Const.ID_SELFIE});
        bSelfieFound = true;
      }

      for (const file of filesArray) {
        let index = undefined;
        if (user.identity_images) {
          index = user.identity_images.includes(file.value);
        }

        if (index) {
          file.uploaded = !user.identity_images.uploaded_documents[index].error;
          file.error = user.identity_images.uploaded_documents[index].error;
          file.deviceId = user.identity_images.uploaded_documents[index].id;

          completed = Boolean(completed & file.uploaded);
        } else {
          file.uploaded = false;
          completed = false;
        }

        file.frontCamera = file.value === Const.ID_SELFIE;
        // logger.info('File ' + JSON.stringify(file.value) + ' uploaded: ' + JSON.stringify(file.uploaded));
      }

      return {
        data: true,
        status: HttpStatus.OK,
        completed: completed,
        files: JSON.stringify(filesArray),
        country: user.shortcodeData.country,
      };
    }
  }
}

module.exports = {
  extractNames,
  getImageStatus,
};
