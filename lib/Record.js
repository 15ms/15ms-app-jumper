class Record {
  constructor(record) {
    if (!record) record = {};
    if (!record.name) {
      throw new Error('name required');
    }
    if (!record.href) {
      throw new Error('href required');
    }
    this.name = record.name;
    this.href = record.href;
    this.code = record.code;
  }

  toSecureJSON() {
    // do NEVER output code
    return {
      name: this.name,
      href: this.href
    };
  }
}

module.exports = Record;
