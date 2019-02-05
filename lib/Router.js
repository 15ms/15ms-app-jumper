const os = require('os');
const path = require('path');
const level = require('level');
const Cache = require('lru-cache');

class Router {
  constructor(options) {
    this.store = level(path.join(options.store || os.homedir(), '.15ms'));
    this.cache = new Cache(options.cache || {
      max: 1000, maxAge: 1000 * 60 * 15
    });
  }

  async findName(name) {
    if (!name) throw new Error('null name');
    let value = null;
    if (this.cache.has(name)) {
      value = this.cache.get(name);
    } else {
      value = await this.store.get(name);
      this.cache.set(name, value);
    }
    console.log(value);
    return value.host;
  }

  listNames() {
    return new Promise((resolve, reject) => {
      const names = [];
      this.store.createKeyStream()
        .on('error', error => reject(error))
        .on('data', data => names.push(data))
        .on('end', () => resolve(names));
    });
  }

  async bindName(name, host, code) {
    if (
      !/[0-9a-zA-Z.-:]/.test(host)
      || host.startsWith('localhost')
      || host.startsWith('127.0.0.1')
    ) {
      throw new Error('invalid host');
    }
    let value = this.cache.get(name);
    if (!value) value = { host, code };
    else {
      if (value.host === host) return;
      if (value.code && value.code !== code) {
        throw new Error('invalid code');
      }
      value.host = host;
    }
    this.cache.set(name, value);
    await this.store.put(name, value);
  }

  async killName(name, code) {
    const value = this.cache.get(name) || await this.store.get(name);
    if (value) {
      if (value.code && value.code !== code) {
        throw new Error('invalid code');
      }
      await this.store.del(name);
      this.cache.del(name);
    }
  }
}

module.exports = Router;
