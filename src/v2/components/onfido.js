const fetch = require('./fetch.js');
const logger = require('../components/logger')(module);

/**
 * Create Applicant
 * @param {object} token - Data from the email_token collection
 * @return {object} onfido_id.id - onfio applicant id
 */
function createApplicant(token) {
  try {
    return new Promise(function(resolve, reject) {
      const firstName = 'Enter';
      const lastName = 'Name';
      const applicant = {
        url: 'https://api.onfido.com/v2/applicants',
        method: 'POST',
        headers: {'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`},
        body: {first_name: firstName, last_name: lastName, email: token.email},
      };
      fetch.fetchData(applicant)
          .then((onfidoId) => {
            token.onfido_id = onfidoId.id;
            logger.info('applicaticant created for %s with id %s',
                token.email, token.onfidoId);
            resolve(token);
          })
          .catch((err) => {
            logger.error('error create applicant: %s', err);
            reject(err);
          });
    });
  } catch (err) {
    logger.error('error create applicant: %s', err);
  }
}

/**
 * Update Applicant
 * @param {object} data - The data to update tje applicant with
 * @param {object} _onfidoId - The onfido id to update
 * @return {object} onfido_id.id - onfio applicant id
 */
function updateApplicant(data, _onfidoId) {
  try {
    return new Promise(function(resolve, reject) {
      const firstName = data.name_first;
      const middleName = data.name_middle;
      const lastName = data.name_last;
      const gender = data.gender;
      const dateBirthDay = data.date_birth_day;
      const dateBirthMonth = data.date_birth_month;
      const dateBirthYear = data.date_birth_year;
      const dob = `${dateBirthYear}-${dateBirthMonth}-${dateBirthDay}`;
      const flatNumber = data.address_flat_number;
      const buildingName = data.address_building_name;
      const buildingNumber = data.address_building_number;
      const street = data.address_one;
      const subStreet = data.address_two;
      const state = data.address_state;
      const town = data.address_town;
      const postcode = data.address_zip;
      const country = data.address_country.toUpperCase();
      const onfidoid = _onfidoId;
      const mobile = `+${data.phone_code} ${data.phone_mobile}`;

      const rowApplicant = {
        url: `https://api.onfido.com/v2/applicants/${onfidoid}`,
        method: 'PUT',
        headers: {'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`},
        body: {
          'first_name': firstName,
          'last_name': lastName,
          'middle_name': middleName,
          country,
          dob,
          mobile,
          gender,
          'addresses[][flat_number]': flatNumber,
          'addresses[][building_name]': buildingName,
          'addresses[][building_number]': buildingNumber,
          'addresses[][street]': street,
          'addresses[][sub_street]': subStreet,
          'addresses[][town]': town,
          'addresses[][postcode]': postcode,
          'addresses[][country]': country,
        },
      };

      const usApplicant = {
        url: `https://api.onfido.com/v2/applicants/${onfidoid}`,
        method: 'PUT',
        headers: {'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`},
        body: {
          'first_name': firstName,
          'last_name': lastName,
          'middle_name': middleName,
          country,
          dob,
          mobile,
          gender,
          'addresses[][flat_number]': flatNumber,
          'addresses[][building_name]': buildingName,
          'addresses[][building_number]': buildingNumber,
          'addresses[][street]': street,
          'addresses[][sub_street]': subStreet,
          'addresses[][town]': town,
          'addresses[][state]': state,
          'addresses[][postcode]': postcode,
          'addresses[][country]': country,
        },
      };

      let applicant;
      if (country == 'usa' || country == 'USA') {
        applicant = usApplicant;
      } else {
        applicant = rowApplicant;
      }
      fetch.fetchData(applicant)
          .then((onfidoId) => {
            logger.info('update applicant: %s', data);
            resolve(onfidoId.id);
          })
          .catch((err) => {
            logger.error('update applicant: %s', err);
            reject(err);
          });
    });
  } catch (err) {
    logger.error('update applicant: %s', err);
  }
}

/**
 * Update Applicant
 * @param {object} onfidoId - The onfido id to update
 * @return {object} docCount - how many documents has the user uploaded
 */
function checkImages(onfidoId) {
  try {
    return new Promise(function(resolve, reject) {
      const applicant = {
        url: `https://api.onfido.com/v2/applicants/${onfidoId}/documents`,
        method: 'GET',
        headers: {'Authorization': `Token token=${process.env.ONFIDO_TOKEN}`},
      };
      fetch.fetchData(applicant)
          .then((imageData) => {
            if (imageData &&
              imageData.documents &&
              imageData.documents.length >0) {
              const docCount = imageData.documents.length;
              resolve(docCount);
            } else {
              const docCount = 0;
              resolve(docCount);
            }
          })
          .catch((err) => {
            logger.error('error check images: %s', err);
            reject(err);
          });
    });
  } catch (err) {
    logger.error('error check images: %s', err);
  }
}

module.exports = {
  createApplicant,
  updateApplicant,
  checkImages,
};
