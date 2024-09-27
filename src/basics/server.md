---
title: "Server"
description: "The server is the central component of the presentation layer of a Goyave application."
---

# Server

The **server** is the central component of the [presentation layer](/getting-started/architecture.html#presentation-layer-http-rest). Its reference is used to let all **components** access the essential resources of an application (configuration, database, language, logger, etc).

A server is created with `goyave.New(options)`.

:::info
You can learn more about all the available options on the [go.pkg.dev reference](https://pkg.go.dev/goyave.dev/goyave/v5#Options).
:::

When the server is created:
- Unless a configuration is specified in the options, the application's configuration file is loaded, overriding the default values.
- The [language](/advanced/localization.html) files are loaded.
- The HTTP server is initialized but it **doesn't** listen on the network yet. The router is created but doesn't contain any route yet. 
- The database connection pool is created if the configuration doesn't specify `none` as the database connection type.

## State

The server state is an atomic number. The atomic nature of this state makes it concurrently safe, so any goroutine can read it easily. It allows the start and stop controls to be called from any goroutine.

The state is incremented for each stage:
- `0` **Created**: the server was just created with `goyave.New()`
- `1` **Preparing**: the `Start()` method has ben called but the server is not yet ready to serve requests
- `2` **Ready**: the server is ready to serve requests
- `3` **Stopped**: the server was stopped (either manually, from a signal hook, or because an error occurred)

This state is not directly accessible and is abstracted by the `IsReady()` method.

The state is never decremented because a server instance is not meant for re-use. After being stopped, a server **cannot be restarted**. 

## Hooks

### Startup hooks

Startup hooks are executed in **a single goroutine** that they all share, in the order of registration, after the network listener starts accepting connections.

```go
server, err := goyave.New(goyave.Options{})
if err != nil {
	fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
	os.Exit(1)
}

server.RegisterStartupHook(func(s *goyave.Server) {
	s.Logger.Info("Server is listening", "host", s.Host())
})
```

:::warning
In case of error, the `server.Start()` method immediately returns. In this case, your startup hooks may or may not be executed. The framework limits this by checking if the state is ready before executing them, but due to the nature of the Go concurrency model, the goroutine might start before the serve error is returned.

For startup hooks that strongly depend on the server's resources, it is a good practice to check that the server's state is ready a second time.

```go
server.RegisterStartupHook(func(s *goyave.Server) {
	if !s.IsReady() {
		return
	}
	//...
})
```
:::

### Shutdown hooks

Shutdown hooks are executed when the server stops before `server.Start()` returns, and are executed in the order of registration in the **same goroutine as the caller** of `server.Start()`. 

Shutdown hooks are **not executed** if there is an error while creating the network listener.

These hooks are useful when you need to stop background processes or goroutines (such as a websocket hub handler).


:::warning
Shutdown hooks are therefore **blocking operations** and do not use a timeout mechanism. If you expect your hooks to take an indeterminate amount of time, you are responsible of implementing a timeout mechanism yourself.
:::

```go
server, err := goyave.New(goyave.Options{})
if err != nil {
	fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
	os.Exit(1)
}

server.RegisterShutdownHook(func(s *goyave.Server) {
	s.Logger.Info("Server is shutting down")
})
```

### OS Signal hook

You can register a OS signal hook that will listen on `SIGINT` and `SIGTERM` signals. If one of these signals is received, the server's shutdown process is initiated. 

```go
server, err := goyave.New(goyave.Options{})
if err != nil {
	fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
	os.Exit(1)
}

server.RegisterSignalHook()
```

The signal listener is removed automatically when the server stops. This signal channel is **buffered** with a buffer size of 64, leaving enough room in case many signals are sent at once.

:::tip 
It is **recommended** to always register the signal hooks, except in tests. Properly handling signals will improve how your application behaves when deployed in production.
:::

## Registering routes

Before starting your server, you need to regsiter your routes:

```go
server, err := goyave.New(goyave.Options{})
if err != nil {
	fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
	os.Exit(1)
}

server.RegisterRoutes(route.Register) // route.Register is a func(*Server, *Router)
```

:::tip Info
You can find more information about routing in the [routing documentation](/basics/routing.html).
:::

## Start

Once the server is ready and you have registered all your hooks, services, repositories and routes, you can start your server.

```go
if err := server.Start(); err != nil {
	server.Logger.Error(err)
	os.Exit(3)
}
```

:::tip
The error returned by `server.Start()` will always be of type `*goyave.dev/goyave/v5/util/errors.Error`.
:::

## Stop

The server can be stopped manually from any goroutine. It is a concurrently safe operation.

```go
server.Stop()
```

When the server stops, active connections are not interrupted but new connections won't be accepted.

`server.Start()` returns after the execution of all **shutdown hooks** in the order of registration. If there is any, the database connection is cleanly closed as well.

:::tip
You should always make sure that your program exits **after** `server.Start()` returns for a graceful shutdown.
:::

## Context

The server makes use of the [context](https://pkg.go.dev/context) API. By default, the server uses `context.Background()`, but a custom base context can be specified in the `Options` with `options.BaseContext`. 

It will be used as base context for all incoming requests. The provided `net.Listener` is the specific `Listener` that's about to start accepting requests. The context returned has a the server instance added to it as a value. The server can thus be retrieved using `goyave.ServerFromContext(ctx)`. If the context is canceled, the server won't shut down automatically, you are responsible of calling `server.Stop()` if you want this to happen. Otherwise the server will continue serving requests, at the risk of generating "context canceled" errors.

```go
type customKey struct{}

func main() {
	opts := goyave.Options{
		BaseContext: func(l net.Listener) context.Context {
			return context.WithValue(context.Background(), customKey{}, "custom value")
		},
	}

	//...
}
```

## Database

The database connection can be retrieved from the server with `server.DB()`.

```go
server.DB()
```

### Transaction mode

Goyave supports transaction mode for tests. You can set it so all DB requests are run inside a transaction that can then be rolled back.

```go
import (
	//...
	"goyave.dev/goyave/v5/util/testutil"
)

func TestDB(t *testing.T) {
	server, err := testutil.NewTestServer(t, "config.test.json")
	//...
	rollback := server.Transaction()
	//...
	t.Cleanup(rollback)
}
```

### Manually replacing the database

You can manually replace the database if need to, for example for mocking. **This is not concurrently safe** and should only be used in tests.

If a connection already exists, it is closed before being discarded.

```go
import (
	//...
	"goyave.dev/goyave/v5/util/testutil"
	"gorm.io/gorm/utils/tests"
)

func TestDB(t *testing.T) {
	server, err := testutil.NewTestServer(t, "config.test.json")
	//...
	err := server.ReplaceDB(tests.DummyDialector{})
	//...
}
```