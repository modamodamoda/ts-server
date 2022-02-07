/**
  * Request callback type - useful outside for enforcing routing callback param types
  */
import { isIncoming, isOutgoing } from './reqres.js';
import { pathToRegexp } from 'path-to-regexp';
function hasCallbacksOrRouters(cbs) {
    for (let i of cbs) {
        if (!(i instanceof Router) && !(i instanceof Function))
            return false;
    }
    return true;
}
function isRoute(variable) {
    return variable !== undefined && variable.path !== undefined;
}
function removeTrailingSlash(str) {
    return str.replace(/\/$/, '');
}
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
  * Checks the path of a route against the request path, returning a list of matches if RegEXP
  *
  * @private
  */
function checkRoutePath(req, routePath) {
    if (routePath === null)
        return [];
    else if (typeof routePath === 'string') {
        if (routePath == req)
            return [];
        else
            return null;
    }
    else if (routePath instanceof RegExp) {
        return routePath.exec(req);
    }
    throw new Error('Invalid type for routePath');
}
/**
  * Generates a path ending with a star, for middleware use
  *
  * @private
  */
function generateMiddlewarePath(str) {
    return str[str.length - 1] == '/' ? str + '*' : str + '/*';
}
/**
  * @class Linked-list based router tree, supports linking to other router trees
  *
  * @private
  */
export default class Router {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
        this.basePath = '';
        this.handler = (req, res, next, route = null) => {
            this._handler(req, res, next);
        };
    }
    /**
      * Add a route
      *
      * @param {string} path Path pattern
      * @param {method} [method] HTTP Request Method
      * @param {function[]} ...callbacks Callback
      *
      */
    route(path, methodOrCB, ...callbacks) {
        if (typeof methodOrCB === 'string') // plz make real overloads one day
            this._route(path, methodOrCB, ...callbacks);
        else if (methodOrCB === null) // for some reason when i add this to the previous if statement, typescript breaks 
            this._route(path, null, ...callbacks);
        else
            this._route(path, null, methodOrCB, ...callbacks);
    }
    /**
      * Internal logic for routing
      *
      * @param {string} path Path pattern to add
      * @param {string} method HTTP Request method to match
      * @param {function[]} ...callbacks Callback
      *
      * @private
      */
    _route(path, method, ...callbacks) {
        if (path[0] !== '/')
            throw new Error('Please start all routes with a forward slash'); // subject to change
        let keys = [];
        const init = /(^[^\*\+\?\\\}\}\:\)\(]+)/.exec(path)[1];
        const ins = {
            path: { method: method, regexp: path, initial: removeTrailingSlash(init), keys: keys },
            callback: callbacks
        };
        if (/[\+\?\\\}\}\:\)\(]/.test(path))
            ins.path.regexp = pathToRegexp(path, keys);
        else if (path.substr(-1) === '*') {
            if (path.substr(-2) == '/*')
                ins.path.regexp = new RegExp('^' + escapeRegExp(path.substr(0, path.length - 2)) + '(\\/.*|$)');
            else
                ins.path.regexp = null; // Matches all (i.e. use initial check only)
        }
        else if (path.substr(-1) == '/') {
            ins.path.regexp = new RegExp('^' + escapeRegExp(path.substr(0, path.length - 1)) + '/?$');
        }
        ins.callback.reverse(); // Reverse them, since .pop is faster
        this.addRaw(ins);
    }
    get(path, ...callbacks) {
        this.route(path, 'get', ...callbacks);
    }
    post(path, ...callbacks) {
        this.route(path, 'post', ...callbacks);
    }
    /**
      * Use callbacks or routers on all requests beginning with path
      *
      * @param {string} path The path
      */
    use(path, ...callbacks) {
        if (!hasCallbacksOrRouters(callbacks))
            throw new Error('Array contains invalid types');
        let current = [];
        const basePath = this.basePath + removeTrailingSlash(path);
        path = generateMiddlewarePath(path);
        for (let i of callbacks) {
            if (i instanceof Router) {
                i.basePath = basePath;
                this.route(path, (req, res, next) => i.handler(req, res, next));
                if (current.length > 0) {
                    this.route(path, ...current);
                    current = [];
                }
            }
            else
                current.push(i);
        }
        if (current.length > 0)
            this.route(path, ...current);
    }
    /**
      * Add our route to the linked list
      *
      * @param {Route} route The route
      */
    addRaw(route) {
        if (this.length === 0)
            this.tail = this.head = route; // ensure reference is kept
        else {
            this.tail.next = route;
            this.tail = route;
        }
        this.tail.next = null; // null pointer our new tail's next
        this.length++;
    }
    handleCallback(req, res, callback, next) {
        if (!isOutgoing(res))
            throw new Error('Invalid response object');
        if (!isIncoming(req))
            throw new Error('Invalid request object');
        if (callback.length === 1) {
            callback[0](req, res, next);
        }
        else {
            let arr = callback;
            const travCallbacks = () => {
                if (arr.length === 0)
                    next();
                else {
                    const handler = arr.pop();
                    handler(req, res, travCallbacks);
                }
            };
            travCallbacks();
        }
    }
    /**
      * Router middleware internal logic.
      *
      * @param {IncomingMessage} req HTTP Request
      * @param {ServerResponse} res HTTP Response
      * @param {Req} next Handler to run after completion
      * @param {Route} route Current route reference
      *
      * @private
      */
    _handler(req, res, next = null, route) {
        if (!isOutgoing(res))
            throw new Error('Invalid response object');
        if (!isIncoming(req))
            throw new Error('Invalid request object');
        let n = route !== undefined ? route : this.head;
        while (n !== null && isRoute(n) /* for empty reference */) {
            const reqPath = req.path;
            if (reqPath.substr(this.basePath.length, n.path.initial.length) == n.path.initial && (n.path.method === null || n.path.method.toLowerCase() === req.method.toLowerCase())) {
                const result = checkRoutePath(reqPath.substr(this.basePath.length), n.path.regexp);
                if (result !== null) {
                    req.params = {};
                    for (let k = 1; k < result.length; k++) {
                        if (n.path.keys[k - 1] !== undefined)
                            req.params[n.path.keys[k - 1].name] = result[k];
                    }
                    this.handleCallback(req, res, n.callback, () => this._handler(req, res, next, n.next));
                    return;
                }
            }
            n = n.next;
        }
        if (next !== null)
            next(req, res);
        else if (!res.writableEnded) {
            res.status(404).end('Not found');
        }
    }
}
export class FastRouter extends Router {
    constructor() {
        super(...arguments);
        this.hashmap = {};
    }
    _handler(req, res, next, route = null) {
        if (!isOutgoing(res))
            throw new Error('Invalid response object');
        if (!isIncoming(req))
            throw new Error('Invalid request object');
        const r = this.hashmap[req.url.substr(this.basePath.length)];
        if (r)
            this.handleCallback(req, res, r.callback, next);
        else
            next(req, res);
    }
    addRaw(route) {
        if (route.path.method !== null)
            throw new Error('Todo: add method filters to FastRouter');
        if (typeof route.path.regexp !== 'string')
            throw new Error('Route\'s path should be plain for the fast router, no regex is accepted');
        this.hashmap[route.path.regexp] = route;
    }
}
