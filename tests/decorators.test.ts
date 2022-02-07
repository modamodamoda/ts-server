import supertest from 'supertest';
import assert from 'assert';
import server from '../index.js';
import Router from '../router.js';
import { Controller, Route, Next, Param, Response, Request, Middleware } from '../decorators.js';

import http from 'http';

const app = server();
const serv = http.createServer(app.handler);

function supershortcut(query: string, expected: string, done, method = 'get') {
  supertest(serv)[method](query)
    .expect(res => assert.equal(res.text, expected))
    .end(function(err, res){
      if (err) done(err);
      else done();
  });
}

describe("Decorator tests", function() {
  @Controller('/dectest')
  class tt {
    @Middleware()
    mw(@Response() res, @Next() next) {
      res.write('_loadedMW');
      next();
    }
    @Route('/hello')
    hello(@Request() req, @Response() res, @Param('g') g) {
      res.end('_' + g);
    }
    @Route()
    index(req, res, next) {
      res.end('_index');
    }
  }
  app.controller(tt);
  it("Testing basic route with middleware", function(done) {
    supershortcut('/dectest', '_loadedMW_index', done);
  });
  it("Testing sub-route with params", function(done) {
    supershortcut('/dectest/hello?g=test', '_loadedMW_test', done);
  });
});
