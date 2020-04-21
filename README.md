# 15ms-router

A short link server.

## Usage

### install as dependency
```sh
npm install --save 15ms-router@latest
```

### use API to start server
```js
const jumpServer = require('15ms-router');

jumpServer({
  name: 'YOUR-APP-NAME',
  secure: {
    public: '', // optional: public key file
    private: '', // only for debug, private key file
  },
  router: {
    rootdir: 'data-dir', // optional: local data directory
    cache: {}, // optional: lru-cache options
  },
  remote: {
    connect: 'mysql://', // mysql connect string
  }
});
```

### call server HTTP APIs

```js
var secure = new Secure({
  private: ''
});
/*
sign(
  HEX,
  SHA256,
  JSON({ verb, data, time = YYYY-MM-DD HH:mm })
)
*/

var payload = {
  verb: 'action',
  data: {},
  hash: secure.createHash(verb, data)
}

fetch('http://15ms', {
  method: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify(payload)
});
```

#### action: bind
```js
{ name, href, code }
```

#### action: kill
```js
{ name, code }
```

#### action: find
```js
{ name }
```

#### action: list
```js
{ }
```

### access to short link

Open `http://15ms/your-link` and redirect to target.