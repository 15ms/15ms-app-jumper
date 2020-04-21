/* global describe it before */
/* eslint-disable arrow-body-style, global-require */

const assert = require('assert');
const path = require('path');
const childProcess = require('child_process');
const fetch = require('node-fetch');
const Secure = require('../lib/Secure');
const Server = require('../lib');

function requestAPI(verb, data, hash) {
  return fetch('http://localhost:8080', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ verb, data, hash })
  });
}

function toJSON(response) {
  return response.json();
}

function toText(response) {
  return response.text();
}

function assertStatus(status) {
  return (response) => {
    assert.equal(response.status, status);
    return response;
  };
}

function assertAPISuccess(payload) {
  return (response) => {
    assert.equal(response.status, 200);
    return response.json().then((json) => {
      assert.ok(json.state);
      assert.deepEqual(json.model, payload);
    });
  };
}

function assertAPIFailure(message) {
  return (response) => {
    assert.equal(response.status, 200);
    return response.json().then((json) => {
      assert.ok(!json.state);
      assert.equal(json.error, message);
    });
  };
}

describe('Server', () => {
  let server;
  let secure;

  before(() => {
    childProcess.execSync(`rm -rf ${path.join(__dirname, 'fixtures/.15ms')}`);
    secure = new Secure({
      public: path.join(__dirname, 'fixtures/15ms.pub'),
      private: path.join(__dirname, 'fixtures/15ms.key')
    });
    server = new Server({
      router: {
        rootdir: path.join(__dirname, 'fixtures')
      },
      secure: {
        public: path.join(__dirname, 'fixtures/15ms.pub'),
      }
    });
    server.listen(8080);
  });

  describe('APIs', () => {
    it('call without verb, should done', () => {
      const hash = secure.createHash('', '');
      return requestAPI('', '', hash)
        .then(toText)
        .then((text) => {
          assert.equal(text, '15ms');
        });
    });

    it('call with non-existed-verb, should done', () => {
      const hash = secure.createHash('test', '');
      return requestAPI('test', '', hash)
        .then(assertAPIFailure('not implemented'));
    });

    it('call without hash, should fail', () => {
      return requestAPI('find', 'abc')
        .then(assertStatus(403));
    });

    it('call with error hash, should fail', () => {
      return requestAPI('find', 'abc', '1234abcd')
        .then(assertStatus(401));
    });

    it('bind name with invalid href - localhost 1, should fail', () => {
      const data = { name: 'abc', href: 'http://localhost:8080' };
      const hash = secure.createHash('bind', data);
      return requestAPI('bind', data, hash)
        .then(assertAPIFailure('invalid localhost'));
    });

    it('bind name with null href, should fail', () => {
      const data = { name: 'abc', href: '' };
      const hash = secure.createHash('bind', data);
      return requestAPI('bind', data, hash)
        .then(assertAPIFailure('href required'));
    });

    it('bind name with invalid scheme, should fail', () => {
      const data1 = { name: 'abc', href: '/abc' };
      const data2 = { name: 'abc', href: 'abc/abc' };
      const data3 = { name: 'abc', href: '//abc' };
      const data4 = { name: 'abc', href: 'a_z://abc' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('bind', data2);
      const hash3 = secure.createHash('bind', data3);
      const hash4 = secure.createHash('bind', data4);
      return Promise.all([
        requestAPI('bind', data1, hash1).then(assertAPIFailure('invalid scheme')),
        requestAPI('bind', data2, hash2).then(assertAPIFailure('invalid scheme')),
        requestAPI('bind', data3, hash3).then(assertAPIFailure('invalid scheme')),
        requestAPI('bind', data4, hash4).then(assertAPIFailure('invalid scheme'))
      ]);
    });

    it('bind name with invalid href - localhost 2, should fail', () => {
      const data = { name: 'abc', href: 'http://127.0.0.1:9999' };
      const hash = secure.createHash('bind', data);
      return requestAPI('bind', data, hash)
        .then(assertAPIFailure('invalid localhost'));
    });

    it('bind name with href, should done', () => {
      const data1 = { name: 'a', href: 'https://a1.test.com' };
      const data2 = { name: 'a' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPISuccess(data1)));
    });

    it('bind name with old host, should done, for coverage', () => {
      const data1 = { name: 'a', href: 'https://a1.test.com' };
      const data2 = { name: 'a' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPISuccess(data1)));
    });

    it('bind name with new host, should done, for coverage', () => {
      const data1 = { name: 'a', href: 'https://a2.test.com' };
      const data2 = { name: 'a' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPISuccess(data1)));
    });

    it('bind more name with host and code, should done', () => {
      const data1 = { name: 'b', href: 'https://b1.test.com', code: '123' };
      const data2 = { name: 'b' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          // must assert no-code in payload
          .then(assertAPISuccess({ name: 'b', href: 'https://b1.test.com' })));
    });

    it('bind name with new host and old code, should done', () => {
      const data1 = { name: 'b', href: 'https://b2.test.com', code: '123' };
      const data2 = { name: 'b' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          // must assert no-code in payload
          .then(assertAPISuccess({ name: 'b', href: 'https://b2.test.com' })));
    });

    it('bind name with new host and new code, should fail', () => {
      const data1 = { name: 'b', href: 'https://b3.test.com', code: '456' };
      const data2 = { name: 'b' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPIFailure('code not matched'))
        .then(() => requestAPI('find', data2, hash2)
          // must assert no-code in payload
          .then(assertAPISuccess({ name: 'b', href: 'https://b2.test.com' })));
    });

    it('bind name for kill test, should done', () => {
      const data1 = { name: 'c', href: 'https://c1.test.com', code: '123' };
      const data2 = { name: 'c' };
      const hash1 = secure.createHash('bind', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('bind', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPISuccess({ name: 'c', href: 'https://c1.test.com' })));
    });

    it('kill name with new code, should fail', () => {
      const data1 = { name: 'c', code: '456' };
      const data2 = { name: 'c' };
      const hash1 = secure.createHash('kill', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('kill', data1, hash1)
        .then(assertAPIFailure('code not matched'))
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPISuccess({ name: 'c', href: 'https://c1.test.com' })));
    });

    it('kill name with old code, should done', () => {
      const data1 = { name: 'c', code: '123' };
      const data2 = { name: 'c' };
      const hash1 = secure.createHash('kill', data1);
      const hash2 = secure.createHash('find', data2);
      return requestAPI('kill', data1, hash1)
        .then(assertAPISuccess())
        .then(() => requestAPI('find', data2, hash2)
          .then(assertAPIFailure('name not found')));
    });

    it('list names, should done', () => {
      const hash = secure.createHash('list', '');
      return requestAPI('list', '', hash)
        .then(assertAPISuccess(['a', 'b']));
    });

    it('find name, null name, should fail', () => {
      const hash = secure.createHash('find', '');
      return requestAPI('find', '', hash)
        .then(assertAPIFailure('name required'));
    });
  });

  describe('Jump', () => {
    it('find name, new name, should fail', () => {
      return fetch('http://localhost:8080/c')
        .then(assertStatus(404));
    });

    it('find name, old name, should done', () => {
      return fetch('http://localhost:8080/a', { redirect: 'manual' })
        .then((response) => {
          assert.equal(response.status, 302);
          assert.equal(response.headers.get('Location'), 'https://a2.test.com/');
        });
    });
  });
});
