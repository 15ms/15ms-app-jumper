const path = require('path');
const Server = require('./lib/Server.js');

// openssl genrsa -out 15ms.pem 512
// openssl rsa -in 15ms.pem -pubout -out 15ms.pub
// openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in 15ms.pem -out 15ms.key

const server = new Server({
  secure: {
    public: path.join(__dirname, 'example/15ms.pub'),
    private: path.join(__dirname, 'example/15ms.key')
  }
});
server.listen(8080);
