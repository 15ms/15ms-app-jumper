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

function assertStatus(status) {
  return function (response) {
    assert.equal(response.status, status);
    return response;
  }
}

function toJSON(response) {
  return response.json();
}

function toText(response) {
  return response.text();
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
    return fetch(concatAPI('', '', hash)).then(toText)
      .then(text => {
        assert.equal(text, '15ms\n');
      });
  });

  it('call without hash, should fail', () => {
    return fetch(concatAPI('find', 'abc'))
      .then(assertStatus(401));
  });  

  it('call with error hash, should fail', () => {
    return fetch(concatAPI('find', 'abc', '1234abcd'))
      .then(assertStatus(403));
  });  

  it('bind name with invalid host - 1, should fail', () => {
    const hash = secure.hashAPI('bind', 'abc,localhost:8080');
    return fetch(concatAPI('bind', 'abc,localhost:8080', hash))
      .then(assertStatus(500)).then(toJSON)
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with invalid host - 2, should fail', () => {
    const hash = secure.hashAPI('bind', 'abc,127.0.0.1:9999');
    return fetch(concatAPI('bind', 'abc,127.0.0.1:9999', hash))
      .then(assertStatus(500)).then(toJSON)
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with host, should done', () => {
    const hash1 = secure.hashAPI('bind', 'a,a1.test.com');
    const hash2 = secure.hashAPI('find', 'a');
    return fetch(concatAPI('bind', 'a,a1.test.com', hash1))
      .then(assertStatus(200)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch(concatAPI('find', 'a', hash2))
          .then(assertStatus(200)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
          });
      });
  });

  it('bind name with old host, should done, for coverage', () => {
    const hash1 = secure.hashAPI('bind', 'a,a1.test.com');
    const hash2 = secure.hashAPI('find', 'a');
    return fetch(concatAPI('bind', 'a,a1.test.com', hash1)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch(concatAPI('find', 'a', hash2)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
          });
      });
  });

  it('bind name with new host, should done, for coverage', () => {
    const hash1 = secure.hashAPI('bind', 'a,a2.test.com');
    const hash2 = secure.hashAPI('find', 'a');
    return fetch(concatAPI('bind', 'a,a2.test.com', hash1)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch(concatAPI('find', 'a', hash2)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a2.test.com' });
          });
      });
  });

  it('bind more name with host and code, should done', () => {
    const hash1 = secure.hashAPI('bind', 'b,b1.test.com,123');
    const hash2 = secure.hashAPI('find', 'b');
    return fetch(concatAPI('bind', 'b,b1.test.com,123', hash1)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch(concatAPI('find', 'b', hash2)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'b1.test.com' });
          });
      });
  });

  it('bind name with new host and old code, should done', () => {
    const hash1 = secure.hashAPI('bind', 'b,b2.test.com,123');
    const hash2 = secure.hashAPI('find', 'b');
    return fetch(concatAPI('bind', 'b,b2.test.com,123', hash1)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch(concatAPI('find', 'b', hash2)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'b2.test.com' });
          });
      });
  });

  it('bind name with new host and new code, should fail', () => {
    const hash1 = secure.hashAPI('bind', 'b,b3.test.com,456');
    const hash2 = secure.hashAPI('find', 'b');
    return fetch(concatAPI('bind', 'b,b3.test.com,456', hash1))
      .then(assertStatus(500)).then(toJSON)
      .then(json1 => {
        assert.deepEqual(json1, { state: false, error: 'invalid code' });
        return fetch(concatAPI('find', 'b', hash2)).then(toJSON)
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'b2.test.com' });
          });
      });
  });

  it('bind name for kill test, should done', () => {
    const hash1 = secure.hashAPI('bind', 'c,c1.test.com,123');
    const hash2 = secure.hashAPI('find', 'c');
    return fetch(concatAPI('bind', 'c,c1.test.com,123', hash1))
      .then(assertStatus(200)).then(() => {
        return fetch(concatAPI('find', 'c', hash2))
          .then(assertStatus(200)).then(toJSON)
          .then((json) => {
            assert.deepEqual(json, { state: true, model: 'c1.test.com' });
          });
      });
  });

  it('kill name with new code, should fail', () => {
    const hash1 = secure.hashAPI('kill', 'c,456');
    const hash2 = secure.hashAPI('find', 'c');
    return fetch(concatAPI('kill', 'c,456', hash1))
      .then(assertStatus(500)).then(toJSON)
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid code' });
        return fetch(concatAPI('find', 'c', hash2)).then(assertStatus(200));
      });
  });

  it('kill name with old code, should done', () => {
    const hash1 = secure.hashAPI('kill', 'c,123');
    const hash2 = secure.hashAPI('find', 'c');
    return fetch(concatAPI('kill', 'c,123', hash1))
      .then(assertStatus(200)).then(toJSON)
      .then(json => {
        assert.deepEqual(json, { state: true });
        return fetch(concatAPI('find', 'c', hash2)).then(assertStatus(404));
      });
  });

  it('list names, should done', () => {
    const hash = secure.hashAPI('list', '');
    return fetch(concatAPI('list', '', hash)).then(toJSON)
      .then(json => {
        assert.deepEqual(json, { state: true, model: ['a', 'b'] });
      });
  });

  it('find name, null name, should fail', () => {
    const hash = secure.hashAPI('find', '');
    return fetch(concatAPI('find', '', hash)).then(toJSON)
      .then(json => {
        assert.deepEqual(json.state, false);
      });
  });

  it('find name, should fail', () => {
    const hash = secure.hashAPI('find', 'c');
    return fetch(concatAPI('find', 'c', hash)).then(toJSON)
      .then(json => {
        assert.deepEqual(json.state, false);
      });
  });
});

describe('Jump', () => {
  it('find name, new name, should fail', () => {
    return fetch('http://localhost:8080/c').then(assertStatus(404));
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
        assert.equal(response.headers.get('Location'), 'http://b2.test.com/1/2.3/4-5?q1=1&q2=2');
      })
  });
});
