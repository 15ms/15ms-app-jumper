const http = require('http');
const URL = require('url');
const Router = require('./Router.js');
const Secure = require('./Secure.js');

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

class Server {
  constructor(options = {}) {
    this.secure = new Secure(options);
    this.router = new Router(options);
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  async handleRequest(request, response) {
    console.log(`<${request.method}> ${request.url}`);
    const url = URL.parse(request.url, true);
    const incoming = {
      method: request.method,
      url: URL.parse(request.url, true),
      headers: Object.assign({}, request.headers)
    };
    const outgoing = (url.pathname === '/')
      ? await this.handleAPIs(incoming)
      : await this.handleJump(incoming);
    response.writeHead(outgoing.status, outgoing.headers);
    if (outgoing.buffer) {
      response.write(outgoing.buffer);
    }
    response.end();
  }

  async handleAPIs(incoming) {
    const { url } = incoming;
    const { verb = '', data = '', hash } = url.query;
    if (!verb) {
      return { status: 200, buffer: '15ms\n' };
    }
    if (!hash) {
      return { status: 401, buffer: 'unauthorized' };
    }
    if (this.secure.hashAPI(verb, data) !== hash) {
      return { status: 403, buffer: 'forbidden' };
    }
    const tokens = data.split(',');
    try {
      switch (verb) {
        case 'bind': {
          await this.router.bindName(tokens[0], tokens[1], tokens[2]);
          return { status: 200, buffer: buildAPIReply(true) };
        }
        case 'kill': {
          await this.router.killName(tokens[0], tokens[1]);
          return { status: 200, buffer: buildAPIReply(true) };
        }
        case 'find': {
          const result = await this.router.findName(tokens[0]);
          return { status: 200, buffer: buildAPIReply(result) };
        }
        case 'list': {
          const result = await this.router.listNames();
          return { status: 200, buffer: buildAPIReply(result) };
        }
        default: {
          return { status: 200, buffer: buildAPIReply(true) };
        }
      }
    } catch (error) {
      const reply = { status: 500, buffer: buildAPIReply(error) };
      if (error.notFound) reply.status = 404;
      return reply;
    }
  }

  async handleJump(incoming) {
    const { url } = incoming;
    const name = (url.path.match(/\/([^/]+)/) || [])[1];
    try {
      const host = await this.router.findName(name);
      const target = `http://${url.path.replace(/\/[^/]+/, host)}`;
      // console.log(target);
      return {
        status: 302,
        headers: { Location: target }
      };
    } catch (error) {
      if (error.notFound) {
        return { status: 404, buffer: 'not found\n' };
      }
      return { status: 500, buffer: buildAPIReply(error) };
    }
  }

  listen(port) {
    this.server.listen(port, () => {
      console.log('15ms listen at', port);
    });
  }
}

module.exports = Server;
