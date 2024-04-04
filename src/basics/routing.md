---
title: "Routing"
description: "Defining routes is the action of associating a URI, sometimes having parameters, with a handler which will process the request and respond to it."
---

# Routing

[[toc]]

## Introduction

Routing is an essential part of any Goyave application. Defining routes is the action of associating a URI, sometimes having parameters, with a handler which will process the request and respond to it. Separating and naming routes clearly is important to make your API clear and expressive.

The entry point for defining your routes is the main **route registrer function** that you will pass to your server's `server.RegisterRoutes()` method.

```go
func Register(server *goyave.Server, router *goyave.Router) {
	//...
}
```

## Basic routing

When defining a route, you must provide a `goyave.Handler`, which is a function with the following signature:
```go
func(response *Response, request *Request)
```

Usually, the handler given is a function with a **controller** structure receiver. Learn more in the [controllers page](/basics/controllers.html) and below in the [controllers section](#controllers).

All HTTP methods are supported, and there are shortcuts for the most common methods:
```go
func Register(_ *goyave.Server, router *goyave.Router) {
	router.Get("/get", handler)
	router.Post("/post", handler)
	router.Put("/put", handler)
	router.Patch("/patch", handler)
	router.Delete("/delete", handler)
	router.Options("/options", handler)
}
```

If you want a single route to match multiple methods, use `router.Route()`:
```go
func Register(_ *goyave.Server, router *goyave.Router) {
	router.Route([]string{http.MethodGet, http.MethodPost}, "/path", handler)
}
```

### Matching algorithm

The Goyave router uses a tree-like structure that is defined by the developer of the application using [subrouters](#groups-and-sub-routers).

- The current router is first checked for a **partial match**. A partial match is when the requested URI starts with the router's prefix.
- If the router matches, its subrouters are checked **in order of registration**. The first of them that matches will then be checked using **recursion**.  When a branch is explored, there is **no turning back**, meaning all subrouters defined after the one that partially matched will **not** be checked. Routes being checked after subrouters, they won't be checked neither in this case.
- If no subrouter matches, the routes associated with the current router are checked **in order of registration**.
- If a route matches but with a method that doesn't correspond to the request, the process is not stopped and the other routes of the current router are checked.
- Trailing slashes are not accepted. For example, if a route has the path `/categories`, the URI `/categories/` won't match.
- Route groups (subrouters with an empty prefix) don't stop the process if they match a route with a method that doesn't correspond to the request: they are not considered as a branch in the tree structure.

:::tip
When no route matches, two **special routes** can be returned: the "Not found" and "Method not allowed" routes.

Those two routes are [**named**](#named-routes) so they can be easily identified from a [global middleware](#middleware):
- Not found is named `goyave.RouteNotFound = "goyave.not-found"`
- Method not allowed is named `goyave.RouteMethodNotAllowed = "goyave.method-not-allowed"`
:::

## Handling HEAD

A client requesting a route with the `HEAD` method expects **only the response headers** that would be returned by the same route with the `GET` method.

If not specified explicitly in the route definition, the `HEAD` method is **automatically added** to all routes matching the `GET` method. When a route is matched with the `HEAD` method, it is executed as usual but the response body is discarded. That means that database queries and other operations are still executed.

In specific scenarios, you may want to add a route definition exclusively for the `HEAD` method to prevent expensive operations to be executed. Register it before the corresponding `GET` route so it will be matched first. Keep in mind the returned headers should be the same as the ones returned by the `GET` handler.

```go
func Register(_ *goyave.Server, router *goyave.Router) {
	router.Route([]string{http.MethodHead}, "/expensive", func(response *goyave.Response, _ *goyave.Request) {
		response.Header().Set("Content-Type", "application/json; charset=utf-8")
		response.Status(http.StatusOK)
	})
	router.Get("/expensive", handler)
}
```


## Closures

Although it's not recommended, routes can be defined using closures. This is a very simple way of defining routes that can be used for scaffolding or quick testing.

```go
func Register(server *goyave.Server, router *goyave.Router) {
	router.Get("/closure", func(response *goyave.Response, request *goyave.Request) {
		response.String(http.StatusOK, "Hi!")
	})
}
```

## Route parameters

URIs can have parameters, defined using the format `{name}` or `{name:pattern}`. If a regular expression pattern is not defined, the matched variable will be anything until the next slash.

**Example:**
```go
router.Get("/product/{key}", showProduct)
router.Get("/product/{id:[0-9]+}", showProductById)
router.Get("/category/{category}/{id:[0-9]+}", showCategory)
```

Regex groups can be used inside patterns, as long as they are non-capturing (`(?:re)`). For example:

```go
router.Get("/category/{category}/{sort:(?:asc|desc|new)}", showCategorySorted)
```

Route parameters can be retrieved as a `map[string]string` in handlers using the request's `RouteParams` field.

```go
router.Get("/product/{key}", func(response *goyave.Response, request *goyave.Request) {
	key := request.RouteParams["key"]
	//...
})
router.Get("/category/{category}/{id:[0-9]+}", func(response *goyave.Response, request *goyave.Request) {
	id, err := strconv.ParseInt(request.RouteParams["id"], 10, 64)
	if err != nil {
		response.Status(http.StatusNotFound)
		return
	}
	//...
})
```

:::warning
If you expect your route parameter to be numeric, and use it as such (for example in a `WHERE id = ?` SQL statement), you **should always** parse it before and not use it directly as a `string`. Strings can hold numeric representation of numbers so large they don't fit in any native Go numeric type (and not in your database engine types neither).

To avoid database errors in case of such wrong user input. Parse and return a `404 Not Found` status error if it fails like in the example above.
:::


## Subrouters

You can create branches by URI segments in your router tree using **subrouters**. On top of improving matching performance, this also helps you better organize your code, apply middleware and meta on specific parts of your application, and manage route-related settings with the most granularity. 

Usually, a subrouter is created for each resource in your application:
```go
users := router.Subrouter("/users")
// Register user-related routes

articles := router.Subrouter("/articles")
// Register article-related routes
```

:::info
In this scenario, an incoming request with a URI starting with `/users` will direct the router in the `users` branch, and the `articles` branch will never be checked for matches.
:::

The bigger your application grows, the greater the performance benefits of splitting routes in many branches will be. A good structure will make it so the router has as less routes to check as possible. 

Subrouters are checked before routes, meaning that they have priority over the latter. If you have a router sharing a prefix with a higher-level level route, **it will never match** because the subrouter will match first.

```go
subrouter := router.Subrouter("/product")
subrouter.Get("/{id:[0-9]+}", handler)

router.Get("/product/{id:[0-9]+}", handler) // This route will never match
router.Get("/product/category", handler)    // This one neither
```

## Groups

A group is **a subrouter having an empty prefix**. It is not considered a branch in the router tree structure, therefore it doesn't stop the matching process if none of its routes and subrouter match, or if a route matches with the incorrect method ("Method not allowed").

You can use groups to avoid having to apply middleware or meta individually on many routes. For example, a resource may be publicly readable, but requires authentication for updates. In this scenario, you can create a group for the routes that require authentication:

```go
router.Middleware(auth.ConfigBasicAuth())
resource := router.Subrouter("/resource")
resource.Get("/{id:[0-9]+}", func(response *goyave.Response, request *goyave.Request) {
	// user is NOT authenticated
	//...
})

resourceAuth := resource.Group().SetMeta(auth.MetaAuth, true)
resourceAuth.Patch("/{id:[0-9]+}", func(response *goyave.Response, request *goyave.Request) {
	// user is authenticated
	//...
})
```

## Controllers

Controllers can register routes themselves if they implement the `goyave.Registrer` interface:

```go
type UserController struct {
	goyave.Component
}

func (ctrl *UserController) RegisterRoutes(router *goyave.Router) {
	subrouter := router.Subrouter("/users")

	subrouter.Get("/{userID:[0-9+]}", ctrl.Show)
}
```

Controllers implementing this interface can then be used in `router.Controller()`:
```go
func Register(_ *goyave.Server, router *goyave.Router) {
	router.Controller(&user.UserController{})
}
```

This will initialize the **component** then call `RegisterRoutes`. Therefore, it is possible to access all the server resources from inside `RegisterRoutes`. This way, routes related to a resource are located at the same place as the handlers for this resource.

:::tip
Learn more about **controllers** in the [dedicated section](/basics/controllers.html).
:::

## Named routes

It is possible to give a name to your routes to make it easier to retrieve them later and build dynamic URLs. **Route names must be unique.**

```go
router.Get("/product/{id:[0-9]+}", handler).Name("product.show")
```

Then you can retrieve the route name from the request:
```go
request.Route.GetName()
```

Finally, you can retrieve a named route from any router using `GetRoute()`. The map in which the route names are stored is stored in the main router and global to all of its subrouters.

```go
router := request.Route.GetParent()
route := router.GetRoute("product.show")
```

:::warning
`route.GetParent()` *may* return `nil` if the route is a **special route** ("Not found" and "Method Not Allowed"). Bear this in mind where developing global middleware.
:::

## Metadata

Each route and router holds a `Meta map[string]any` which can be used to store additional information about it. This information is usually used by middleware.

For example, the built-in authentication middleware checks if the route has (or inherit) the meta `auth.MetaAuth` before starting the authentication process. That way, routes (or groups) can be individually marked as requiring authentication or not, with only a single registration of the auth middleware.

### Defining metadata

You can define metadata on your routes and routers using `SetMeta()`:
```go
router.SetMeta("key", "value")
router.Get("/hello", handler).SetMeta("key", "value")

// Alternatively, use the map directly
router.Meta["key"] = "value"
```

:::tip
- Using the methods instead of direct map manipulation allows **chaining**.
- Is is recommended to use **namespaced constants** as key names to make them easier to retrieve, reduce the risk of error (typo), and the risk of collision between modules.
```go
const MetaCustom = "myapp.custom"
```
:::

It is also possible to remove keys. This doesn't remove meta using the same key from the parent routers. So if a parent router has a metadata with the key that was removed, the current route/router will now [inherit](#inheritance) it from that parent.

```go
router.RemoveMeta("key")
// or
delete(router.Meta, "key")
```

### Accessing metadata

From any handler, you can access the meta from the request's route:

```go
request.Route.LookupMeta("key")
value, ok := request.Route.Meta["key"]
```

:::danger
Although it is possible to access the metadata map directly from handlers, you should **never** modify it as it would not be a concurrently safe operation.

Once you're out of the route registration step, consider the metadata **readonly**.
:::

### Inheritance

`LookupMeta()` searches for the value in the current route/router. If it cannot be found, the value is looked for in the parent router, all the way up until the main router. This allows metadata **inheritance**.

```go
router.SetMeta("key", "value")
router.Get("/hello", func(response *goyave.Response, request *goyave.Request) {
	request.Route.LookupMeta("key") // "value" (from router)
})
```

Using this concept of inheritance, it is possible to **override** metadata granularly. For example, if you have a route group that requires authentication, but a single route in this group doesn't, override the metadata on this route specifically to disable auth:

```go
router.Middleware(auth.ConfigBasicAuth())
router.SetMeta(auth.MetaAuth, true)
router.Get("/authenticated", authHandler) // This route requires auth
router.Get("/hello", handler).SetMeta(auth.MetaAuth, false) // This route doesn't require auth
``` 

## Middleware

Middleware are handlers **stacked** over the controller handler, and executed one by one **in the order of registration**. Middleware from parent routers are executed **before** those from the current router.

:::center
![Middleware stack diagram](/diagrams/middleware_stack.webp){data-zoomable}
:::

:::tip
Learn more about **middleware** in the [dedicated section](/basics/middleware.html).
:::


Let's take a simple Gzip compression middleware for our examples:
```go
import (
	"compress/gzip"
	"goyave.dev/goyave/v5/middleware/compress"
)

//...

compressMiddleware := &compress.Middleware{
	Encoders: []compress.Encoder{
		&compress.Gzip{Level: gzip.BestCompression},
	},
}
```

In the following example, only the `/compressed` route will have compression because the middleware is applied on this route specifically:

```go
router.Get("/hello", handler)
router.Get("/compressed", handler).Middleware(compressMiddleware)
```

In the following example, both routes will have compression because the middleware is applied on the router:
```go
router.Middleware(compressMiddleware)
router.Get("/hello", handler)
router.Get("/compressed", handler)
```

### Global middleware

Global middleware are like regular middleware but are stored only inside the main router, and are executed for **every single request**, even if the matched route is "Not found" or "Method not allowed". All subrouters share the same slice of global middleware.

As shown in the stack diagram in the previous section, the global middleware are executed first, **in order of registration**.

Typical use-cases for global middleware are parsing, [logging](/advanced/logging.html) or rate limiting. If you don't use the logging middleware globally, requests that don't match a route won't be logged because regular middleware are only executed when a non-special route is matched.

```go
import "goyave.dev/goyave/v5/middleware/parse"

// The query and body of all requests will be parsed
router.GlobalMiddleware(&parse.Middleware{})
```


## Validation

:::tip
Learn more about **validation** in the [dedicated section](/basics/validation.html).
:::

## URL generation

Using a route's `BuildURI()` and `BuildURL()` or `BuildProxyURL()`, you can generate a path or full URL to this route:

```go
route := router.Get("/product/{id:[0-9]+}", handler)
route.BuildURI("42") // "/product/42"
route.BuildURL("42") // "http://localhost:8080/product/42"
route.BuildProxyURL("42") // "https://myproxydomain.example.com/product/42"
```

### Base URL

You can generate the base URL to your application using `server.BaseURL()`:

```go
server.BaseURL() // "http://localhost:8080"
```

This function uses configuration. If `server.domain` is set, it will be used instead of `server.host`. If the port the server is listening to is equal to `80`, it won't be added to the resulting string.

### Proxy URL

If you are running your application behind a reverse proxy (such as nginx or apache), you may need to generate a URL that does not directly points to your application, but one that points to your proxy instead. Use `server.ProxyBaseURL()` for this.

If the port matches the standard port for the protocol (`80` for HTTP, `443` for HTTPS), it won't be added to the resulting string.

Example with the following config:
```json
{
    "server": {
        ...
        "proxy": {
            "protocol": "https",
            "host": "myproxydomain.example.com",
            "port": 443,
            "base": "/basepath"
        }
    }
}
```

```go
server.ProxyBaseURL() // "https://myproxydomain.example.com/basepath"
route.BuildProxyURL("42") // "https://myproxydomain.example.com/basepath/product/42"
```

:::tip
Is is recommended to always use `ProxyBaseURL()` and `BuildProxyURL()` when generating URLs that will be returned to the client. If no proxy URL is configured, the regular base URL will be returned so it is safe to use no matter the environment where your application is deployed.
:::

## Serve static resources

You can serve static resources easily from any source using `router.Static()`:

```go
import "goyave.dev/goyave/v5/util/fsutil/osfs"

router.Static(&osfs.FS{}, "/static", false)
```

Any file system (FS) implementing `fs.StatFS` can be used as a source: the OS filesystem (`osfs.FS`), an `embed`, a remote cloud storage bucket filesystem, ...

For **embedded** file systems, it is advised to use Goyave's `fsutil.Embed` wrapper:
```go
import (
	"embed"
	"goyave.dev/goyave/v5/util/fsutil"
)

//go:embed resources
var resources embed.FS

//...
fs := fsutil.NewEmbed(resources)
router.Static(fs, "/resources", false)
```

:::info
If you set the third parameter (`download`) to `true`, the response will contain the header `Content-Disposition: attachment; filename="filename.txt"` instead of `Content-Disposition: inline`. This results in most browsers prompting the user to download the file instead of displaying it in a new tab.
:::

The built-in static handler is using smart pathing:
- If the requested path is empty, the `index.html` file will be returned if it exists.
- If the requested path is a directory (with or without trailing slash), the `index.html` file will be returned if it exists.
- If no file can be found, then `404 Not Found` is returned.
- Directories and subdirectories are supported.