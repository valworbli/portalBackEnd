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

module.exports = {
  extractNames,
};
