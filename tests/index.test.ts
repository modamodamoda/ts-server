import supertest from 'supertest';
import assert from 'assert';
import server from '../index.js';
import Router from '../router.js';
import { Controller, Route, Next, Param, Response, Request } from '../decorators.js';

import http from 'http';

const app = server();
const serv = http.createServer(app.handler);

function supershortcut(query, expected, done, method = 'get') {
  supertest(serv)[method](query)
    .expect(res => assert.equal(res.text, expected))
    .end(function(err, res){
      if (err) done(err);
      else done();
  });
}

describe("Router Tests", function() {
  it("it should has status code 404", function(done) {
    supertest(serv)
      .get("/")
      .expect(404)
      .end(function(err, res){
        if (err) done(err);
        else done();
      });
  });
  app.route('/routeTest', (req, res, next) => {
    res.write('_routeTest1');
    next();
  });

  const SR = new Router();
  app.route('/routeTest', (req, res, next) => {
    res.write('_routeTest2');
    next();
  }, (req, res, next) => {
    res.write('_routeTest3');
    next();
  }, (req, res, next) => {
    res.end();
  });
  it("Chaining routes", function(done) {
    supershortcut('/routeTest', '_routeTest1_routeTest2_routeTest3', done);
  });
  it("Middleware should stop chained routes short", function(done) {
    app.use('/routeTest', (req, res, next) => {
      res.end('_stopped');
    });
    supershortcut('/routeTest', '_stopped', done);
  });
  it("Middleware using a separate router", function(done) {
    SR.route('/hello', (req, res) => res.end('_testMW'));
    app.use('/goodbye/', SR);
    supershortcut('/goodbye/hello', '_testMW', done);
  });
  it("Testing params", function(done) {
    SR.route('/hello/:user_id', (req, res) => res.end(req.params.user_id));
    supershortcut('/goodbye/hello/100', '100', done);
  });
  it("Testing GET query", function(done) {
    app.route('/gettest', (req, res) => res.end(req.query.id));
    supershortcut('/gettest?id=500', '500', done);
  });
  it("Testing GET undefined", function(done) {
    supershortcut('/gettest', '', done);
  });
  it("Testing GET separate routes", function(done) {
    app.get('/pgtest', (req, res) => res.end('_getOK'));
    supershortcut('/pgtest', '_getOK', done);
  });
  it("Testing POST separate routes", function(done) {
    app.post('/pgtest', (req, res) => res.end('_postOK'));
    supershortcut('/pgtest', '_postOK', done, 'post');
  });
  it("Testing DELETE seperate routes", function(done) {
    app.route('/pgtest', 'delete', (req, res) => res.end('_deleteOK'));
    supershortcut('/pgtest', '_deleteOK', done, 'delete');
  });
});

