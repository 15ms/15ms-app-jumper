const assert = require('assert');
const path = require('path');
const fetch = require('node-fetch');
const Server = require('..');
const Secure = require('../lib/Secure.js');

function concatAPI(verb, data, hash) {
  let url = 'http://localhost:8080?';
  if (verb) {
    url += 'verb=' + verb;
    if (data) url += '&data=' + data;
    if (hash) url += '&hash=' + hash;
  }
  return url;
}

const server = new Server({
  store: path.join(__dirname, './fixtures'),
  token: 'b9b90db866c64ed69fad8aa395b5c149'
});
const secure = new Secure({
  token: 'b9b90db866c64ed69fad8aa395b5c149'
});
server.listen(8080);

describe('APIs', () => {
  it('call without verb, should done', () => {
    const hash = secure.hashAPI('', '');
    return fetch(concatAPI('', '', hash))
      .then(response => response.text())
      .then(text => {
        assert.equal(text, '15ms\n');
      });
  });

  it('call without hash, should fail', () => {
    return fetch(concatAPI('find', 'abc'))
      .then(response => {
        assert.equal(response.status, 401);
      });
  });  

  it('call with error hash, should fail', () => {
    return fetch(concatAPI('find', 'abc', '1234abcd'))
      .then(response => {
        assert.equal(response.status, 403);
      });
  });  

  it('bind name with invalid host - 1, should fail', () => {
    const hash = secure.hashAPI('bind', 'abc,localhost:8080');
    return fetch(concatAPI('bind', 'abc,localhost:8080', hash))
      .then(response => {
        assert.equal(response.status, 500);
        return response.json();
      })
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with invalid host - 2, should fail', () => {
    const hash = secure.hashAPI('bind', 'abc,127.0.0.1:9999');
    return fetch(concatAPI('bind', 'abc,127.0.0.1:9999', hash))
      .then(response => {
        assert.equal(response.status, 500);
        return response.json();
      })
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with host, should done', () => {
    const hash1 = secure.hashAPI('bind', 'a,a1.test.com');
    return fetch(concatAPI('bind', 'a,a1.test.com', hash1))
      .then(response => response.json())
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        const hash2 = secure.hashAPI('find', 'a');
        return fetch(concatAPI('find', 'a', hash2))
          .then(response => response.json())
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
          });
      });
  });

  it('bind name with old host, should done, cover more code', () => {
    const hash1 = secure.hashAPI('bind', 'a,a1.test.com');
    return fetch(concatAPI('bind', 'a,a1.test.com', hash1))
      .then(response => response.json())
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        const hash2 = secure.hashAPI('find', 'a');
        return fetch(concatAPI('find', 'a', hash2))
          .then(response => response.json())
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
          });
      });
  });

  it('bind name with new host, should done, cover more code', () => {
    const hash1 = secure.hashAPI('bind', 'a,a2.test.com');
    return fetch(concatAPI('bind', 'a,a2.test.com', hash1))
      .then(response => response.json())
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        const hash2 = secure.hashAPI('find', 'a');
        return fetch(concatAPI('find', 'a', hash2))
          .then(response => response.json())
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a2.test.com' });
          });
      });
  });

  it('bind more name with host, should done', () => {
    const hash1 = secure.hashAPI('bind', 'b,b1.test.com');
    return fetch(concatAPI('bind', 'b,b1.test.com', hash1))
      .then(response => response.json())
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        const hash2 = secure.hashAPI('find', 'b');
        return fetch(concatAPI('find', 'b', hash2))
          .then(response => response.json())
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'b1.test.com' });
          });
      });
  });

  it('list names, should done', () => {
    const hash = secure.hashAPI('list', '');
    return fetch(concatAPI('list', '', hash))
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: true, model: ['a', 'b'] });
      });
  });

  it('find name, null name, should fail', () => {
    const hash = secure.hashAPI('find', '');
    return fetch(concatAPI('find', '', hash))
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json.state, false);
      });
  });

  it('find name, should fail', () => {
    const hash = secure.hashAPI('find', 'c');
    return fetch(concatAPI('find', 'c', hash))
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json.state, false);
      });
  });
});

describe('Jump', () => {
  it('find name, new name, should fail', () => {
    return fetch('http://localhost:8080/c')
      .then(response => {
        assert.equal(response.status, 404);
      })
  });

  it('find name, old name, should done', () => {
    return fetch('http://localhost:8080/a', { redirect: 'manual' })
      .then(response => {
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('Location'), 'http://a2.test.com/');
      })
  });

  it('find name, old name, more path, should done', () => {
    return fetch('http://localhost:8080/b/1/2.3/4-5?q1=1&q2=2', { redirect: 'manual' })
      .then(response => {
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('Location'), 'http://b1.test.com/1/2.3/4-5?q1=1&q2=2');
      })
  });
});
