# ts-server
TypeScript server/router with decorators and support for several express middlewares

## Basic usage
ts-server can be imported as such:

```ts
import server from 'ts-server';
import http from 'http';

const app = server();

http.createServer(app.handler).listen(5000);
```

app.handler is ts-server's handler middleware and can be passed to createServer.

You can then add routes to the app using `app.route`, `app.get`, and `app.post`

```ts
app.route('/test', (req, res) => res.end('test'));
app.get('/testGet', (req, res) => res.end('testGet'));
app.post('/testPost', (req, res) => res.end('testPost'));
app.route('/testDelete', 'delete', (req, res) => res.end('testDelete'));
```

In order to include middleware, use `app.use`. 

```ts
app.use('/', bodyParser());
```

## Sub-routers and Fast Routing

You can attach routers to middleware using `app.use`, which allows you to add a collection of route to a directory, aswell as use other types of routers.

```ts
import Router from 'ts-server/router';

const newRouter = new Router();
newRouter.get('/test', (req, res) => res.end('test')); 
app.use('/controller1', newRouter); // /controller1/test -> 'test'
```
By default, routes are loaded in order using regex patterns. A hashmap fast router is also offered, with one route per path. If you are using a lot of routes with static non-regex paths, this is recommended.

```ts
import { FastRouter } from 'ts-server/router';

const newRouter = new FastRouter();
newRouter.get('/route-1', (req, res) => res.end('test'));
app.use('/', newRouter); // /route-1 -> 'test'
```
