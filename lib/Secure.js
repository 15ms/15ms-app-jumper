const crypto = require('crypto');
const fs = require('fs');

function getTimestamp() {
  const now = new Date();
  const time = ''
    + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} `
    + `${now.getHours()}:${now.getMinutes()}`;
  return time;
}

class Secure {
  constructor(options = {}) {
    if (!options.public) {
      throw new Error('public key required');
    }
    this.publicKey = fs.readFileSync(options.public, 'utf8');
    if (options.private) {
      this.privateKey = fs.readFileSync(options.private, 'utf8');
      if (/OPENSSH/.test(this.privateKey)) {
        throw new Error('invalid private key');
      }
    }
  }

  verifyHash(verb, data, hash) {
    const time = getTimestamp();
    const body = JSON.stringify({ verb, time, data });
    const verify = crypto.createVerify('SHA256');
    verify.update(body);
    return verify.verify(this.publicKey, hash, 'hex');
  }

  createHash(verb, data) {
    const time = getTimestamp();
    const body = JSON.stringify({ verb, time, data });
    const signer = crypto.createSign('SHA256');
    signer.update(body);
    return signer.sign(this.privateKey, 'hex');
  }
}

module.exports = Secure;
