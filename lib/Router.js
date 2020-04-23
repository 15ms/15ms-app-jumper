const os = require('os');
const path = require('path');
const level = require('level');
const Cache = require('lru-cache');
const Record = require('./Record');

class Router {
  constructor(options = {}) {
    this.local = level(path.join(options.rootdir || os.homedir(), '.15ms'));
    this.cache = new Cache(options.cache || {
      max: 1000, maxAge: 1000 * 60 * 15
    });
  }

  async dispatchAction(verb, data) {
    console.log('dispatchAction', verb, data);
    switch (verb) {
      case 'bind': {
        await this.bindRecord(data.name, data.href, data.code);
        return true;
      }
      case 'kill': {
        await this.killRecord(data.name, data.code);
        return true;
      }
      case 'find': {
        const result = await this.findRecordByName(data.name);
        return result.toSecureJSON();
      }
      case 'list': {
        const result = await this.listNamesOfRecords();
        return result;
      }
      default: {
        throw new Error('not implemented');
      }
    }
  }

  async getLocalRecord(name) {
    try {
      return new Record(await this.local.get(name));
    } catch (error) {
      console.error(error);
      throw new Error('name not found');
    }
  }

  async findRecordByName(name) {
    if (!name) throw new Error('name required');
    const record = this.cache.get(name) || await this.getLocalRecord(name);
    this.cache.set(name, record);
    console.log(record);
    return record;
  }

  async listNamesOfRecords() {
    return new Promise((resolve, reject) => {
      const names = [];
      this.local.createKeyStream()
        .on('error', (error) => reject(error))
        .on('data', (data) => names.push(data))
        .on('end', () => resolve(names));
    });
  }

  async bindRecord(name, href, code) {
    if (!href) {
      throw new Error('href required');
    }
    // RFC3986 = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    if (!/^[a-zA-Z]{1}[a-zA-Z0-9+\-.]*:\/\//.test(href)) {
      throw new Error('invalid scheme');
    }
    if (/localhost/.test(href) || /127\.0\.0\.1/.test(href)) {
      throw new Error('invalid localhost');
    }
    let record = this.cache.get(name);
    if (!record) {
      record = new Record({ name, href });
      record.updateCode(code);
    } else {
      if (record.href === href) return;
      if (record.hash && !record.verifyCode(code)) {
        throw new Error('code not matched');
      }
      record.href = href;
      record.updateCode(code);
    }
    this.cache.set(name, record);
    await this.local.put(name, record);
  }

  async killRecord(name, code) {
    const record = this.cache.get(name) || await this.getLocalRecord(name);
    if (record.hash && !record.verifyCode(code)) {
      throw new Error('code not matched');
    }
    await this.local.del(name);
    this.cache.del(name);
  }
}

module.exports = Router;
