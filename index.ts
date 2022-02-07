/* Minimal HTTP server w/ decorator-based router and middleware support
   for typescript */

import Router, { Route, Req } from './router.js';
import { join } from 'path';
import { wrapReq, wrapRes, Incoming, Outgoing } from './reqres.js';

/**
  * Creates a new server instance
  *
  */
export default function() {
  return new Server();
}

/**
  * @class Server handler class
  */
class Server {
  private routes: Router;
  private middlewares: Router;
  public route: Function;
  public get: Function;
  public post: Function;

  constructor() {
    this.routes = new Router();
    this.middlewares = new Router();
    // Create router aliases
    this.route = this.routes.route.bind(this.routes);
    this.get = this.routes.get.bind(this.routes);
    this.post = this.routes.post.bind(this.routes);
  }

  /**
    * Handler, to be passed onto server
    *
    * @param {IncomingMessage|any} req Incoming message
    * @param {ServerResponse|any} res Outgoing response
    *
    */
  handler = (req: Incoming, res: Outgoing) => {
    // set up initial stuff
    wrapReq(req);
    wrapRes(res);
    this.middlewares.handler(req, res, this.routes.handler);
  }

  /**
    * Use a middleware
    *
    * @param {string} path Path pattern
    * @param {function[]} ...callbacks Callback or routers
    *
    */
  use(path: string, ...callbacks: any) {
    this.middlewares.use(path, ...callbacks);
  }

  /**
    * Use a controller
    *
    * @param {class} ctrl Controller
    *
    */
  controller(ctrl: any) {
    return new ctrl(this);
  }

}
