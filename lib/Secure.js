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

  verifySign(verb, data, hash) {
    const time = getTimestamp();
    const body = JSON.stringify({ verb, time, data });
    const verify = crypto.createVerify('SHA256');
    verify.update(body);
    return verify.verify(this.publicKey, hash, 'hex');
  }

  createSign(verb, data) {
    const time = getTimestamp();
    const body = JSON.stringify({ verb, time, data });
    const signer = crypto.createSign('SHA256');
    signer.update(body);
    return signer.sign(this.privateKey, 'hex');
  }

  static verifyData(data, code, hash) {
    const actual = this.digestData(data, code);
    return actual === hash;
  }

  static digestData(data, code) {
    const hasher = crypto.createHash('SHA256');
    const source = data + '-' + code;
    hasher.update(source);
    return hasher.digest('base64');
  }
}

module.exports = Secure;
