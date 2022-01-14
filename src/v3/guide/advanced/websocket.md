---
meta:
  - name: "og:title"
    content: "Websocket - Goyave"
  - name: "twitter:title"
    content: "Websocket - Goyave"
  - name: "title"
    content: "Websocket - Goyave"
---

# Websocket <Badge text="Since v3.7.0"/>

[[toc]]

## Introduction

Websocket is a protocol defined in [RFC 6455](https://tools.ietf.org/html/rfc6455) allowing duplex communication channels using a single TCP connection. This is especially useful for real-time communication between the clients and the server. Websockets can be used for chat applications for example.

Websocket connections have the following life-cycle:
- The client requests the server using HTTP on a dedicated route. The client expresses that it wants to upgrade its connection using HTTP headers.
- The server upgrades the connection by switching protocols.
- The connection is kept alive and both peers can communicate in either way.
- Either the client or the server decides to close the connection. The close handshake is performed before the TCP connection is closed. 

Goyave is using [`gorilla/websocket`](https://github.com/gorilla/websocket) and adds a layer of abstraction to it to make it easier to use. You don't have to write the connection upgrading logic nor the close handshake. Just like regular HTTP handlers, websocket handlers benefit from reliable error handling and panic recovery.

First, import the websocket package:
```go
import "goyave.dev/goyave/v3/websocket"
```

You may need the `gorilla/weboscket` package too. If so, import it with an alias, such as `ws`:
```go
import ws "github.com/gorilla/websocket"
```

## Connection upgrade

The first step in adding websockets to your application is to register a route aimed at upgrading the connection to a websocket connection.

```go
upgrader := websocket.Upgrader{}
router.Get("/websocket", upgrader.Handler(myWebsocketHandler))
```

`upgrader.Handler()` create an HTTP handler upgrading the HTTP connection before passing it to the given `websocket.Handler`. Learn more about websocket handlers below, the [websocket handler section](#websocket-handlers). After a successful upgrade, the HTTP response status is set to "101 Switching Protocols".

::: warning
Upgraded connections are [**hijacked**](https://golang.org/pkg/net/http/#Hijacker). It is advised to read about the implications of hijacking in Goyave [here](../basics/responses.html#hijack).
:::

### Upgrade options

#### UpgradeErrorHandler

UpgradeErrorHandler specifies the function for generating HTTP error responses.

The default UpgradeErrorHandler returns a JSON response containing the status text corresponding to the status code returned. If debugging is enabled, the reason error message is returned instead.

```json
{"error": "message"}
```

`websocket.UpgradeErrorHandler` is an alias for `func(response *goyave.Response, request *goyave.Request, status int, reason error)`.

**Example:**
```go
upgrader := websocket.Upgrader{
    UpgradeErrorHandler: func(response *goyave.Response, request *goyave.Request, status int, reason error) {
        text := http.StatusText(status)
        if config.GetBool("app.debug") && reason != nil {
            text = reason.Error()
        }
        message := map[string]string{
            "error": text,
        }
        response.JSON(status, message)
    },
}
```

#### ErrorHandler

ErrorHandler specifies the function handling errors returned by websocket Handler. If nil, the error is written to "goyave.ErrLogger". If the error is caused by a panic and debugging is enabled, the default ErrorHandler also writes the stacktrace. See the [error handling](#error-handling) section for more details.

#### CheckOrigin

CheckOrigin (`func(r *goyave.Request) bool`) returns true if the request Origin header is acceptable. If CheckOrigin is `nil`, then a safe default is used: return false if the Origin request header is present and the origin host is not equal to request `Host` header.

A CheckOrigin function should carefully validate the request origin to prevent cross-site request forgery.

#### Headers

Headers is a function (`func(request *goyave.Request) http.Header`) generating headers to be sent with the protocol switching response.

**Example:**
```go
upgrader := websocket.Upgrader{
    Headers: func(request *goyave.Request) http.Header {
        h := http.Header{}
        h.Set("X-Custom-Header", "value")
        return h
    },
}
```

#### Settings

Settings the parameters of the underlying `gorilla/websocket` `Upgrader` for upgrading the connection. Check their [documentation](https://pkg.go.dev/github.com/gorilla/websocket#Upgrader) for more details.

"Error" and "CheckOrigin" are ignored: use the Goyave upgrader's "UpgradeErrorHandler" and "CheckOrigin".

## Websocket handlers

Websocket connections use a different type of handler: `websocket.Handler`, which is an alias for `func(*websocket.Conn, *goyave.Request) error`. The `request` parameter contains the original upgraded HTTP request.

To keep the connection alive, these handlers should run an infinite for loop that can return on error or exit in a predictable manner. They also can start goroutines for reads and writes, but shouldn't return before both of them do. The Handler is responsible of synchronizing the goroutines it started, and ensure no reader nor writer are still active when it returns.

If the websocket handler returns `nil`, it means that everything went fine and the connection can be closed normally. On the other hand, the websocket handler can return an error, such as a write error, to indicate that the connection should not be closed normally.

The following websocket `Handler` is an example of an "echo" feature using websockets:
```go
func Echo(c *websocket.Conn, request *goyave.Request) error {
    for {
        mt, message, err := c.ReadMessage()
        if err != nil {
            return err
        }
        goyave.Logger.Printf("recv: %s", message)
        err = c.WriteMessage(mt, message)
        if err != nil {
            return fmt.Errorf("write: %w", err)
        }
    }
}
```

::: tip
- Learn more about the available functions on the [`gorilla/websocket` documentation](https://pkg.go.dev/github.com/gorilla/websocket#Conn).
- For a more complex example, check out the [chat application example](https://github.com/go-goyave/websocket-example).
:::

When using the built-in `Upgrader` and its `Upgrader.Handler()` function, the connection is closed automatically after the websocket `Handler` returns, using the closing handshake defined by RFC 6455 Section 1.4 if possible. If the websocket `Handler` returns an error that is not a `CloseError`, the `Upgrader`'s error handler will be executed and the close frame sent to the client will have status code 1011 (internal server error) and "Internal server error" as message. If debug is enabled, the message will be set to the one of the error returned by the websocket `Handler`. Otherwise the close frame will have status code 1000 (normal closure) and "Server closed connection" as a message.

## Error handling

The HTTP handler returned by `Upgrader.Handler()` handles errors returned by websocket `Handler`. If the returned error is not nil, the `Upgrader`'s `ErrorHandler` will be executed. By default, the error is printed to `goyave.ErrLogger`, but this behavior can be overridden.

It also features a panic recovery mechanism. If the websocket `Handler` panics, the connection will be gracefully closed just like if the websocket `Handler` returned an error without panicking. The error passed to the `ErrorHandler` in case of error is a `*websocket.PanicError`, wrapping the original error, and containing the stacktrace if debugging is enabled.

```go
upgrader := websocket.Upgrader{
    ErrorHandler: func(request *goyave.Request, err error) {
        goyave.ErrLogger.Println(err)
        if e, ok := err.(*websocket.PanicError); ok {
            // The websocket Handler panicked
            if e.Stacktrace != "" {
                goyave.ErrLogger.Println(e.Stacktrace)
            }
        }
    },
}
```

### Return an error or panic?

The websocket `Handler` should only panic in case of unexpected error, such as "invalid memory address or nil pointer dereference" and other **programming** errors. Return an error for everything else (database access error, read/write errors, failed calls to other backend services and APIs, etc.).

## Testing

To test websockets, you have to open a client connection from your test, write to it, then send a close frame. The following piece of code is a test for the "echo" handler seen in a previous example:

```go
import (
	"testing"

	"goyave.dev/goyave/v3"
	"goyave.dev/goyave/v3/config"
	ws "github.com/gorilla/websocket"

    "github.com/username/myproject/route"
)

type WebsocketTestSuite struct {
	goyave.TestSuite
}

func (suite *WebsocketTestSuite) TestUpgrade() {
	suite.RunServer(route.Register, func() {
		conn, _, err := ws.DefaultDialer.Dial(goyave.BaseURL()+"/websocket", nil)
		if err != nil {
			suite.Error(err)
			return
		}
		defer conn.Close()

		message := []byte("hello world")
		suite.Nil(conn.WriteMessage(ws.TextMessage, message))

		messageType, data, err := conn.ReadMessage()
		suite.Nil(err)
		suite.Equal(ws.TextMessage, messageType)
		suite.Equal(message, data)

		m := ws.FormatCloseMessage(ws.CloseNormalClosure, "Connection closed by client")
		suite.Nil(conn.WriteControl(ws.CloseMessage, m, time.Now().Add(time.Second)))
	})
}

func TestWebsocketSuite(t *testing.T) {
	goyave.RunTest(t, new(WebsocketTestSuite))
}
```
