---
title: "Websockets"
description: "Websockets is a protocol allowing duplex communication channels using a single TCP connection. Goyave adds a layer of abstraction to it to make it easier to setup and use them."
---

# Websockets

[[toc]]

## Introduction

Websocket is a protocol defined in [RFC 6455](https://tools.ietf.org/html/rfc6455) allowing duplex communication channels using a single TCP connection. This is especially useful for real-time communication between the clients and the server. Websockets can be used for chat applications for example.

Websocket connections have the following life-cycle:
- The client requests the server using HTTP on a dedicated route. The client expresses that it wants to **upgrade** its connection using HTTP headers.
- The server upgrades the connection by **switching protocols**.
- The connection is **kept alive** and both peers can communicate in either way.
- Either the client or the server decides to close the connection. The close handshake is performed before the TCP connection is closed. 

Goyave is using [`gorilla/websocket`](https://github.com/gorilla/websocket) and adds a layer of abstraction to it to make it easier to use. You don't have to write the connection upgrading logic nor the close handshake. Just like regular HTTP handlers, websocket handlers benefit from reliable error handling and panic recovery.

First, import the websocket package:
```go
import "goyave.dev/goyave/v5/websocket"
```

You may need the `gorilla/weboscket` package too. If so, import it with an alias, such as `ws`:
```go
import ws "github.com/gorilla/websocket"
```

:::tip
You can find a complete example of a chat application made with websockets in the [websocket-example project](https://github.com/go-goyave/websocket-example).
:::

## Websocket handlers

Websocket handlers are a bit different from regular handlers. The receive a `*websocket.Conn` instead of a `*goyave.Response`, and must be named `Serve` to comply with the `websocket.Controller` interface.

The `request` parameter contains the original upgraded HTTP request.

To keep the connection alive, these handlers should run an infinite for loop that can return on error or exit in a predictable manner. They also can start goroutines for reads and writes, but shouldn't return before both of them do. The handler is responsible of synchronizing the goroutines it started, and ensure no reader nor writer are still active when it returns.

If the websocket handler returns `nil`, it means that everything went fine and the connection can be closed normally. On the other hand, the websocket handler can return an error, such as a write error, to indicate that the connection should not be closed normally. It is equivalent to `response.Error()` in a regular handler.

By default, the server shutdown doesn't wait for hijacked connections to be closed gracefully. It is advised to register a shutdown hook blocking until all the connections are gracefully closed using `*websocket.Conn.CloseNormal()`.

The following **websocket controller** is a simple example of an "echo" feature using websockets:

```go
// http/controller/echo/echo.go
import (
	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/websocket"
	"goyave.dev/goyave/v5/util/errors"
)

type Controller struct {
	goyave.Component
}

func (ctrl *Controller) Serve(c *websocket.Conn, request *goyave.Request) error {
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			return errors.New(err)
		}
		ctrl.Logger().Debug("recv", "message", string(message))
		err = c.WriteMessage(mt, message)
		if err != nil {
			return errors.Errorf("write: %w", err)
		}
	}
}
```

::: tip
Learn more about the available functions on the [gorilla/websocket documentation](https://pkg.go.dev/github.com/gorilla/websocket#Conn).
:::

You can still access query and body data from the websocket handler, as well ad the authenticated user, and every other information from the original request as you would usually do. However, you should still make sure this data is **validated**. To do so, register the upgrade route manually by implementing the `websocket.Registrer` interface:

```go
func (ctrl *Controller) RegisterRoute(router *goyave.Router, handler goyave.Handler) {
	router.Get("", handler).ValidateQuery(JoinRequest)
}
```

## Connection upgrade

Now that we have a working **websocket controller**, we need to register a **route** aimed at **upgrading** the connection to a websocket connection.

```go
import (
	"my-project/http/controller/echo"
	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/websocket"
)

func Register(server *goyave.Server, router *goyave.Router) {
	router.Subrouter("/echo").Controller(websocket.New(&echo.Controller{}))
}
```

`websocket.New()` returns an `Upgrader`, a special **controller** that will automatically register the upgrade route, handle possible errors and perform the close handshake. After a successful upgrade, the HTTP response status is set to "101 Switching Protocols".

::: warning
Upgraded connections are [**hijacked**](https://golang.org/pkg/net/http/#Hijacker). It is advised to read about the implications of hijacking in Goyave [here](/basics/response.html#hijack).
:::

The connection is closed automatically after the websocket handler returns, using the closing handshake defined by RFC 6455 Section 1.4 if possible. If the websocket handler returns an error that is not a `CloseError`, the `Upgrader`'s error handler will be executed and the close frame sent to the client will have status code 1011 (internal server error) and "Internal server error" as message. If debug is enabled, the message will be the error message returned by the websocket handler. Otherwise the close frame will have status code 1000 (normal closure) and "Server closed connection" as a message.

:::info
- The controller given to the upgrader is automatically **initialized** as usual when the route is registered.
- By default, the upgrade route is using an **empty prefix** with the `GET` method. It is advised to use a subrouter with the path of your choice. This is overridden if your controller implements `websocket.Registrer`.
:::

## Upgrade options

### UpgradeErrorHandler

`websocket.UpgradeErrorHandler` is an **interface** that lets your controller handle if the **upgrade** process fails. This happens **before** the connection is hijacked. 

```go
func (ctrl *Controller) OnUpgradeError(response *goyave.Response, _ *goyave.Request, status int, reason error) {
	message := map[string]string{
		"error": reason.Error(),
	}
	response.JSON(status, message)
}
```

### ErrorHandler

`websocket.ErrorHandler` is an **interface** that lets your controller define a custom behavior when your `Serve()` method returns an error or if it panics. This happens **after** the connection is hijacked. The close handshake is **automatically performed** immediately after this error handling.

By default, if your controller doesn't implement this interface, the error is logged with the error level.

```go
func (ctrl *Controller) OnError(_ *goyave.Request, err error) {
	ctrl.Logger().Error(err)
}
```

### OriginChecker

`websocket.ErrorHandler` is an **interface** that lets your controller define a custom `Origin` header checking behavior. If your controller doesn't implement this interface, a safe default is used: return `false` if the `Origin` request header is present and the origin host is not equal to request `Host` header.

Such method should carefully validate the request origin to prevent cross-site request forgery.

```go
func (ctrl *Controller) CheckOrigin(request *goyave.Request) bool {
	//...
	return true
}
```

### HeaderUpgrader

`websocket.HeaderUpgrader` is an **interface** that lets your controller define custom HTTP headers in the protocol switching response. The returned headers are **added** to the mandatory ones. You can use this to specify `Set-Cookie` headers.

```go
func (ctrl *Controller) UpgradeHeaders(request *goyave.Request) http.Header {
	headers := http.Header{}
	headers.Set("X-Custom-Header", "value")
	return headers
}
```

### Settings

You can change the underlying gorilla upgrader by modifying the Goyave's `Upgrader.Settings`. However, changing `Error` and `CheckOrigin` values won't have any effect. Use the interfaces explained above instead.

```go
upgrader := websocket.New(hub)
upgrader.Settings.HandshakeTimeout = time.Second * 3
upgrader.Settings.EnableCompression = true
upgrader.Settings.ReadBufferSize = 512
//...
```

:::info
Check [gorilla/websocket documentation](https://pkg.go.dev/github.com/gorilla/websocket#Upgrader) for more details.
:::

## Testing

To test websockets, you have to open a client connection from your test, write to it, then send a close frame. The following piece of code is a test for the "echo" controller seen in a previous example:

```go
import (
	"fmt"
	"sync"
	"testing"
	"time"

	ws "github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/util/testutil"
	"goyave.dev/goyave/v5/websocket"
)

func TestEcho(t *testing.T) {
	server := testutil.NewTestServer(t, "config.test.json")

	server.RegisterRoutes(func(_ *goyave.Server, router *goyave.Router) {
		router.Subrouter("/echo").Controller(websocket.New(&Controller{}))
	})

	wg := sync.WaitGroup{}
	wg.Add(1)

	server.RegisterStartupHook(func(_ *goyave.Server) {
		defer wg.Done()
		addr := fmt.Sprintf("ws://%s/echo", server.Host())
		conn, _, err := ws.DefaultDialer.Dial(addr, nil)
		require.NoError(t, err)
		defer conn.Close()

		message := []byte("hello world")
		assert.NoError(t, conn.WriteMessage(ws.TextMessage, message))

		messageType, data, err := conn.ReadMessage()
		assert.NoError(t, err)
		assert.Equal(t, ws.TextMessage, messageType)
		assert.Equal(t, message, data)

		m := ws.FormatCloseMessage(ws.CloseNormalClosure, "Connection closed by client")
		assert.NoError(t, conn.WriteControl(ws.CloseMessage, m, time.Now().Add(time.Second)))
	})

	go func() {
		assert.NoError(t, server.Start())
	}()
	defer server.Stop()

	wg.Wait()
}
```