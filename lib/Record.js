const Secure = require('./Secure');

class Record {
  constructor(model) {
    if (!model) model = {};
    if (!model.name) throw new Error('name required');
    if (!model.href) throw new Error('href required');
    this.name = model.name;
    this.href = model.href;
    if (model.time) {
      this.time = model.time;
    } else {
      this.time = Date.now();
    }
    if (model.hash) {
      this.hash = model.hash;
    } else {
      console.warn('hash not provided');
    }
  }

  verifyCode(code) {
    return Secure.verifyData(
      JSON.stringify(this.toSecureJSON(), null, 2),
      code,
      this.hash
    );
  }

  updateCode(code) {
    if (!code) return;
    this.time = Date.now();
    this.hash = Secure.digestData(
      JSON.stringify(this.toSecureJSON(), null, 2),
      code
    );
  }

  toSecureJSON() {
    // do NEVER output hash
    return {
      name: this.name,
      href: this.href,
      time: this.time
    };
  }
}

module.exports = Record;
