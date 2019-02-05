const crypto = require('crypto');

class Secure {
  constructor(options) {
    this.token = options.token;
  }

  hashAPI(verb, data) {
    const now = new Date();
    const time = ''
      + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} `
      + `${now.getHours()}:${now.getMinutes()}`;
    const buffer = JSON.stringify({ verb, data, time });
    const hasher = crypto.createHash('sha256');
    hasher.update(buffer);
    const digest = hasher.digest('hex').substr(now.getHours() * 2, 18);
    return digest;
  }
}

module.exports = Secure;
