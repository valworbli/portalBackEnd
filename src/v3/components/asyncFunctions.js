/**
 * asyncForEach
 * @param {Array} array - The array on which to iterate
 * @param {Function} callback - The callback function
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = {
  asyncForEach,
};
