const http = require('http');
const URL = require('url');
const Router = require('./Router');
const Secure = require('./Secure');

function buildAPIReply(reply) {
  let o = null;
  if (reply instanceof Error) {
    o = { state: false, error: reply.message };
  } else if (reply.constructor.name === 'Boolean') {
    o = { state: reply };
  } else {
    o = { state: true, model: reply };
  }
  return JSON.stringify(o);
}

function buildOutgoing(status, buffer) {
  return { status, buffer };
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    request.on('data', (chunk) => {
      buffer += chunk;
    });
    request.on('error', (error) => reject(error));
    request.on('end', () => resolve(buffer));
  });
}

class Server {
  constructor(options = {}) {
    // console.log(options);
    this.name = options.name || '15ms';
    this.secure = new Secure(options.secure);
    this.router = new Router(options.router);
    // todo - support remote
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  async handleRequest(request, response) {
    console.log(`=> <${request.method}> ${request.url}`);
    const incoming = {
      method: request.method,
      url: URL.parse(request.url, true),
      headers: { ...request.headers },
      body: null
    };
    let outgoing = null;
    if (incoming.method === 'GET') {
      outgoing = await this.handleJump(incoming);
    }
    if (incoming.method === 'POST') {
      try {
        const buffer = await readRequestBody(request);
        if (buffer.length > 4 * 1024) {
          outgoing = buildOutgoing(413, 'payload too large');
          return;
        }
        incoming.body = JSON.parse(buffer);
        outgoing = await this.handleAPIs(incoming);
      } catch (error) {
        outgoing = buildOutgoing(400, 'bad request');
      }
    }
    response.writeHead(outgoing.status, outgoing.headers);
    if (outgoing.buffer) {
      console.log('<=', outgoing.status, outgoing.buffer);
      response.write(outgoing.buffer);
    }
    response.end();
  }

  async handleAPIs(incoming) {
    const { verb, data, hash } = incoming.body;
    if (!verb) {
      return buildOutgoing(200, '15ms');
    }
    if (!hash) {
      return buildOutgoing(403, 'forbidden');
    }
    if (!this.secure.verifySign(verb, data, hash)) {
      return buildOutgoing(401, 'unauthorized');
    }
    try {
      const reply = await this.router.dispatchAction(verb, data);
      return buildOutgoing(200, buildAPIReply(reply));
    } catch (error) {
      return buildOutgoing(200, buildAPIReply(error));
    }
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

  listen(port) {
    this.server.listen(port, () => {
      console.log(`15ms [${this.name}] is listening at`, port);
    });
  }
}

module.exports = Server;
