const http = require('http');
const url = require('url');
const Router = require('./Router.js');

class Server {
  constructor(options = {}) {
    this.router = new Router(options);
    this.server = http.createServer(async (request, response) => {
      console.log(`<${request.method}> ${request.url}`);
      const url = require('url').parse(request.url, true);
      const context = { request, response, url };
      if (url.pathname === '/') {
        this.handleAPIs(context);
      } else {
        this.handleJump(context);
      }
    });
  }

  async handleAPIs(context) {
    const { url, response } = context;
    if (!url.query.action) {
      response.writeHead(400);
      return response.end('bad request');
    }
    const action = url.query.action;
    const attach = (url.query.attach || '').split(',');
    console.log(action, attach)
    if (action === 'bind') {
      try {
        await this.router.bindName(attach[0], attach[1]);
        response.writeHead(200);
        response.write(JSON.stringify({ state: true }));
      } catch (error) {
        response.writeHead(500);
        response.write(JSON.stringify({ state: false, error: error.message }));
      }
    } else if (action === 'list') {
      const result = await this.router.listNames();
      response.writeHead(200);
      response.write(JSON.stringify({ state: true, model: result }));
    } else {
      response.writeHead(200);
      response.write('15ms\n');
    }
    return response.end();
  }

  async handleJump(context) {
    const { url, response } = context;
    const name = (url.path.match(/\/([^\/]+)/) || [])[1];
    try {
      const host = await this.router.findName(name);
      const target = `http://${url.path.replace(/\/[^\/]+/, host)}`;
      // console.log(target);
      response.writeHead(302, {
        Location: target
      });
      // response.writeHead(200);
      // response.write(target);
    } catch (error) {
      if (error.notFound) {
        response.writeHead(404);
        response.write('not found\n');
      } else {
        response.writeHead(500);
        response.write(error.message);
      }
    }
    response.end();
  }

  listen(port) {
    this.server.listen(port, () => {
      console.log('15ms listen at', port);
    });
  }
}

module.exports = Server;