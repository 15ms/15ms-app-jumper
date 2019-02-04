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
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    const value = await this.store.get(name);
    this.cache.set(name, value);
    return value;
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

  async bindName(name, host) {
    if (
      !/[0-9a-zA-Z.-:]/.test(host)
      || host.startsWith('localhost')
      || host.startsWith('127.0.0.1')
    ) {
      throw new Error('invalid host');
    }
    const value = this.cache.get(name);
    if (value === host) return;
    this.cache.set(name, host);
    return this.store.put(name, host);
  }
}

module.exports = Router;
