#!/usr/bin/env node
/* eslint max-len: 0, no-console: 0, require-jsdoc: 0 */
require('dotenv').config({path: '../../../../.env'});
const Archiver = require('./Archiver');

/**
 * Decrypt the archive with
 * cat test.tar.gz | openssl enc -nosalt -d -aes-256-cbc -K $DECRYPT_KEY -iv $DECRYPT_IV | tar xvz
 * Check the contents:
 * cat test.txt
 */
const text = 'Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo Bozo';

async function main() {
  const arch = new Archiver(true);

  arch.start('test.tar.gz');
  arch.archive.append(text, {name: 'test.txt'});
  await arch.stop();

  console.log('All done');

  console.log('Decrypt with:');
  console.log('cat test.tar.gz | openssl enc -d -nosalt -aes-256-cbc -K $KEYBASE64 -iv $IVBASE64 > decrypted.tar.gz');
}

main();
