/* eslint max-len: 0, require-jsdoc: 0 */
const fs = require('fs');
const archiverjs = require('archiver');
const streamBuffers = require('stream-buffers');
const logger = require('../logger').short(module);
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

let that = undefined;

/**
 * Compresses (and optionally encrypts) data
 */
class Archiver {
  constructor(bEncrypt=false) {
    that = this;
    this.outputStreamBuffer = undefined;
    this.mustEncrypt = bEncrypt;
    this.keyBase64 = process.env.KEYBASE64;
    this.ivBase64 = process.env.IVBASE64;
  }

  createArchive() {
    this.archive = archiverjs('tar', {
      gzip: true,
      gzipOptions: {
        level: 9,
      },
    });
    this.archive.on('error', function(err) {
      logger.error('Archiver error: ' + JSON.stringify(err));
    });
  }

  createEncrypt() {
    this.key = Buffer.from(this.keyBase64, 'base64');
    this.iv = Buffer.from(this.ivBase64, 'base64');
    this.encrypt = crypto.createCipheriv(algorithm, this.key, this.iv);
  }

  start(name) {
    this.createArchive();
    if (this.mustEncrypt) {
      this.createEncrypt();
    }

    if (!name) name = 'output.tar.gz';

    if (this.outputStreamBuffer) {
      this.stop();
    }

    this.outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
      initialSize: (100 * 1024),
      incrementAmount: (100 * 1024),
    });

    this.archive.pipe(this.outputStreamBuffer);

    this.name = name;
  }

  async stop(name) {
    if (!this.outputStreamBuffer) {
      logger.error('outputStreamBuffer is NULL, not STOPPING!');
      return true;
    }

    if (!name) name = this.name;
    if (!name) name = 'output.tar.gz';

    const waitForFinish = new Promise((resolve, reject) => {
      if (that.mustEncrypt) {
        that.outputStreamBuffer.on('finish', () => {
          const buff = that.outputStreamBuffer.getContents();
          const encBuff = Buffer.concat([that.encrypt.update(buff), that.encrypt.final()]);
          fs.writeFile(that.name, encBuff, function() {
            logger.info('    Key: ' + that.key.toString('hex'));
            logger.info('    IV: ' + that.iv.toString('hex'));
            logger.info('    ENCRYPTED the archive to ' + that.name);
            resolve(true);
          });
        });
      } else {
        that.outputStreamBuffer.on('finish', () => {
          fs.writeFile(that.name, that.outputStreamBuffer.getContents(), function() {
            logger.info('    Saved the archive to ' + that.name);
            resolve(true);
          });
        });
      }
    });

    this.archive.finalize();

    const result = await waitForFinish.catch(function(err) {});
    this.archive.unpipe(this.outputStreamBuffer);
    this.outputStreamBuffer.end();
    this.outputStreamBuffer = undefined;
    this.archive = undefined;
    this.name = undefined;

    return result;
  }

  async abort() {
    const name = that.name;
    that.name = undefined;

    const waitForFinish = new Promise((resolve, reject) => {
      that.outputStreamBuffer.on('finish', () => {
        logger.warn('        Archive ' + name + ' ABORTED!');
        resolve(true);
      });
    });

    this.archive.finalize();

    const result = await waitForFinish.catch(function(err) {});
    this.archive.unpipe(this.outputStreamBuffer);
    this.outputStreamBuffer.end();
    this.outputStreamBuffer = undefined;
    this.archive = undefined;

    return result;
  }

  async compressFile(data, name, archiveName) {
    this.start(archiveName);
    this.archive.append(data, {name: name});
    await this.stop();
    return true;
  }
}

module.exports = Archiver;
