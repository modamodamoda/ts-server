/* Minimal HTTP server w/ decorator-based router and middleware support
   for typescript */
import Router from './router.js';
import { wrapReq, wrapRes } from './reqres.js';
/**
  * Creates a new server instance
  *
  */
export default function () {
    return new Server();
}
/**
  * @class Server handler class
  */
class Server {
    constructor() {
        /**
          * Handler, to be passed onto server
          *
          * @param {IncomingMessage|any} req Incoming message
          * @param {ServerResponse|any} res Outgoing response
          *
          */
        this.handler = (req, res) => {
            // set up initial stuff
            wrapReq(req);
            wrapRes(res);
            this.middlewares.handler(req, res, this.routes.handler);
        };
        this.routes = new Router();
        this.middlewares = new Router();
        // Create router aliases
        this.route = this.routes.route.bind(this.routes);
        this.get = this.routes.get.bind(this.routes);
        this.post = this.routes.post.bind(this.routes);
    }
    /**
      * Use a middleware
      *
      * @param {string} path Path pattern
      * @param {function[]} ...callbacks Callback or routers
      *
      */
    use(path, ...callbacks) {
        this.middlewares.use(path, ...callbacks);
    }
    /**
      * Use a controller
      *
      * @param {class} ctrl Controller
      *
      */
    controller(ctrl) {
        return new ctrl(this);
    }
}
