const http = require('http');
const URL = require('url');
const Router = require('./Router.js');

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
    const { verb, data = '' } = url.query;
    console.log(verb, data);
    switch (verb) {
      case 'bind': {
        const attach = data.split(',');
        try {
          await this.router.bindName(attach[0], attach[1]);
          return { status: 200, buffer: buildAPIReply(true) };
        } catch (error) {
          return { status: 500, buffer: buildAPIReply(error) };
        }
      }
      case 'find': {
        try {
          const result = await this.router.findName(data);
          return { status: 200, buffer: buildAPIReply(result) };
        } catch (error) {
          return { status: 404, buffer: buildAPIReply(error) };
        }
      }
      case 'list': {
        const result = await this.router.listNames();
        return { status: 200, buffer: buildAPIReply(result) };
      }
      default: {
        return { status: 200, buffer: '15ms\n' };
      }
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
      return { status: 500, buffer: error };
    }
  }

  listen(port) {
    this.server.listen(port, () => {
      console.log('15ms listen at', port);
    });
  }
}

module.exports = Server;
