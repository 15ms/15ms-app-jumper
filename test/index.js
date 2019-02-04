const assert = require('assert');
const path = require('path');
const fetch = require('node-fetch');
const Server = require('../');

const server = new Server({
  store: path.join(__dirname, './fixtures')
});
server.listen(8080);

describe('APIs', () => {
  it('call with null verb, should done', () => {
    return fetch('http://localhost:8080')
      .then(response => response.text())
      .then(text => {
        assert.equal(text, '15ms\n');
      });
  });
  
  it('bind name with host, should fail', () => {
    return fetch('http://localhost:8080/?verb=bind&data=abc,localhost:8080')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with host, should fail', () => {
    return fetch('http://localhost:8080/?verb=bind&data=abc,127.0.0.1:9999')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: false, error: 'invalid host' });
      });
  });

  it('bind name with host, should done', () => {
    return fetch('http://localhost:8080/?verb=bind&data=a,a1.test.com')
      .then(response => response.json())
      .then(json1 => {
        assert.deepEqual(json1, { state: true });
        return fetch('http://localhost:8080/?verb=find&data=a')
          .then(response => response.json())
          .then(json2 => {
            assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
          });
      });
  });

  it('bind name with old host, should done, cover more code', () => {
    return fetch('http://localhost:8080/?verb=bind&data=a,a1.test.com')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: true });
        return fetch('http://localhost:8080/?verb=find&data=a')
        .then(response => response.json())
        .then(json2 => {
          assert.deepEqual(json2, { state: true, model: 'a1.test.com' });
        });
      });
  });

  it('bind name with new host, should done, cover more code', () => {
    return fetch('http://localhost:8080/?verb=bind&data=a,a2.test.com')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: true });
        return fetch('http://localhost:8080/?verb=find&data=a')
        .then(response => response.json())
        .then(json2 => {
          assert.deepEqual(json2, { state: true, model: 'a2.test.com' });
        });
      });
  });

  it('bind more name with host, should done', () => {
    return fetch('http://localhost:8080/?verb=bind&data=b,b1.test.com')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: true });
      });
  });

  it('list names, should done', () => {
    return fetch('http://localhost:8080/?verb=list')
      .then(response => response.json())
      .then(json => {
        assert.deepEqual(json, { state: true, model: ['a', 'b'] });
      });
  });

  it('find name, null name, should fail', () => {
    return fetch('http://localhost:8080/?verb=find')
      .then(response => response.json())
      .then(json => {
        assert.equal(json.state, false);
      });
  });

  it('find name, should fail', () => {
    return fetch('http://localhost:8080/?verb=find&data=c')
      .then(response => response.json())
      .then(json => {
        assert.equal(json.state, false);
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
