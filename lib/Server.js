const http = require('http');
const Router = require('./Router');
const Secure = require('./Secure');

class Server {
  constructor(options = {}) {
    // console.log(options);
    this.name = options.name || '15ms';
    this.secure = new Secure(options.secure);
    this.router = new Router(options.router);
  }

  async handleJump(incoming) {
    const { url } = incoming;
    const name = (url.path.match(/\/([^/]+)/) || [])[1];
    try {
      const record = await this.router.findRecordByName(name);
      const target = record.href;
      return {
        status: 302,
        headers: { Location: target }
      };
    } catch (error) {
      console.error(error);
      return buildOutgoing(404, 'not found');
    }
  }
}

module.exports = Server;
