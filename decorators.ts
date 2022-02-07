import Router, { Req } from './router.js';
import { Incoming, Outgoing } from './reqres.js';

enum ParamTypes {
  Request,
  Response,
  Param,
  Next
}

function getMeta(t) {
  if(t.__ctrlMeta__ === undefined) {
    t.__ctrlMeta__ = {
      routes: [],
      middlewares: [],
      params: {}
    };
  }
  return t.__ctrlMeta__;
}



/**
  * Controller decorator
  * 
  * @param {string} path The path of the base route for the controller
  * @param {function[]} ...middlewares middlewares to be added to the controller
  *
  */
export function Controller(path: string = '/', ...middlewares: Req[]) {
  return (target: any) => {
    return <typeof target>class extends target {
      constructor(in_server) {
        const meta = getMeta(target.prototype);
        const ctrl = new target();
        if(meta.routes.length === 0) throw new Error('No routes found in controller.');
        
        const gen = (propertyName: string) => {
          const cParams = meta.params[propertyName] ? meta.params[propertyName].sort((a, b) => a.index - b.index) : [];
          return (req: Incoming, res: Outgoing, next: Req) => {
            let paramList = [];
            for(let param of cParams) {
              if(param.type == ParamTypes.Request) paramList.push(req);
              else if(param.type == ParamTypes.Response) paramList.push(res);
              else if(param.type == ParamTypes.Next) paramList.push(next);
              else if(param.type == ParamTypes.Param) {
                paramList.push(req.query[param.name] || (req.body && req.body[param.name]) || (req.params && req.params[param.name]));
              }
            }
            this[propertyName].apply(this, paramList.length === 0 ? [req, res, next] : paramList);
          }
        }
        
        const RouteRouter = new Router();
        const MiddlewareRouter = new Router();

        for(let i of meta.middlewares) MiddlewareRouter.use(i.path, gen(i.propertyName));
        for(let i of meta.routes) RouteRouter.route(i.path, i.method, gen(i.propertyName));

        in_server.use(path, MiddlewareRouter);
        in_server.use(path, RouteRouter);
        super();
      }
    }
  }
}

function decFactory(path: string, method: string | null, mw: boolean = false) {
  return (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>): void => {
    const meta = getMeta(target);
    meta[mw ? 'middlewares' : 'routes'].push({
      path: path, 
      method: method,
      propertyName: propertyName });
  }
}

/**
  * Route decorator
  * 
  * @param {string} path The path of the route
  * @param {string|null} method The HTTP request method, null matches all
  *
  */
export function Route(path: string = '/', method: string | null = null) {
  return decFactory(path, method);
}

/**
  * Get request decorator
  * 
  * @param {string} path The path of the route
  *
  */
export function Get(path: string = '/') {
  return decFactory(path, 'get');
}

/**
  * Post request decorator
  * 
  * @param {string} path The path of the route
  *
  */
export function Post(path: string = '/') {
  return decFactory(path, 'post');
}

/**
  * Middleware decorator
  * 
  * @param {string} path The path of the route
  *
  */
export function Middleware(path: string = '/') {
  return decFactory(path, null, true);
}

function paramFactory(name: string | null, type: ParamTypes) {
  return function(target: any, propertyName: string, index: number) {
    const meta = getMeta(target);
    if(meta.params[propertyName] === undefined) meta.params[propertyName] = [];
    meta.params[propertyName].push({ 
        name: name,
        type: type,
        index: index
    }); 
  }
}

/**
  * Parameter (get/post/url param) decorator
  * 
  * @param {string} path The path of the route
  *
  */
export function Param(name: string) {
  return paramFactory(name, ParamTypes.Param);
}

/**
  * HTTP Request function parameter decorator
  *
  */
export function Request() {
  return paramFactory(null, ParamTypes.Request);
}

/**
  * HTTP Response function parameter decorator
  * 
  */
export function Response() {
  return paramFactory(null, ParamTypes.Response);
}

/**
  * Next function parameter decorator
  * 
  * @example
  * middleware(@Response() req, @Next() next) {
  *   req.someFlag = true;
  *   next(); // Go to the next item in the router chain
  * }
  */
export function Next() {
  return paramFactory(null, ParamTypes.Next);
}
