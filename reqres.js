import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
/**
  * Checks if a request object is an IncomingMessage
  *
  * @param {any} req Request object
  *
  */
export function isIncoming(req) {
    return req instanceof IncomingMessage;
}
/**
  * Checks if a response object is a ServerResponse
  *
  * @param {any} res Response object
  *
  */
export function isOutgoing(res) {
    return res instanceof ServerResponse;
}
function parseURLEncoded(str) {
    const x = str.split('&');
    let query = {};
    for (let d of x) {
        const z = d.split('=', 2);
        if (!z[1])
            query[z[0]] = true;
        else
            query[z[0]] = decodeURIComponent(z[1]);
    }
    return query;
}
/**
  * Wrap a request in extra functionality
  *
  * @param {IncomingMessage} req The request object
  *
  */
export function wrapReq(req) {
    if (!isIncoming(req))
        throw new Error("Invalid request object");
    const p = parse(req.url);
    // parse our GET request briefly
    if (p.query) {
        req.query = parseURLEncoded(p.query);
    }
    else
        req.query = {};
    req.path = p.pathname;
    req.header = req.get = (name) => req.headers[name.toLowerCase()];
}
/**
  * Wrap a response in extra functionality
  *
  * @param {ServerResponse} res The response object
  */
export function wrapRes(res) {
    if (!isOutgoing(res))
        throw new Error("Invalid response object");
    res.json = function (obj) {
        res.end(JSON.stringify(obj));
    };
    res.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
    };
}
