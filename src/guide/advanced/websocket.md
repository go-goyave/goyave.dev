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
import "github.com/System-Glitch/goyave/v3/websocket"
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

`upgrader.Handler()` create an HTTP handler upgrading the HTTP connection before passing it to the given `websocket.Handler`. Learn more about websocket handlers below. After a successful upgrade, the HTTP response status is set to "101 Switching Protocols".

::: warning
Upgraded connections are [**hijacked**](https://golang.org/pkg/net/http/#Hijacker). It is advised to read about the implications of hijacking in Goyave [here](../basics/responses.html#hijack).
:::

## Websocket handlers

Websocket connections use a different type of handler: `websocket.Handler`, which is an alias for `func(*websocket.Conn, *goyave.Request) error`. The `request` parameter contains the original upgraded HTTP request.

To keep connection alive, these websocket handlers should run an infinite for loop and check for close errors. When the websocket handler returns, the closing handshake is performed and the connection is closed. Therefore, if the websocket handler is using goroutines, it should use a `sync.WaitGroup` to wait for them to terminate before returning. If the handler returns `nil` it means that everything went fine and the connection can be closed normally. On the other hand, the websocket handler can return an error, such as a read error, to indicate that the connection should not be closed normally.

Don't send closing frames in websocket handlers, that would be redundant with the automatic close handshake performed when the handler returns.

The following websocket `Handler` is an example of an "echo" feature using websockets:
```go
func(c *websocket.Conn, request *goyave.Request) error {
    for {
        mt, message, err := c.ReadMessage()
        if err != nil {
            if websocket.IsCloseError(err) {
                return nil
            }
            return fmt.Errorf("read: %v", err)
        }
        goyave.Logger.Printf("recv: %s", message)
        err = c.WriteMessage(mt, message)
        if err != nil {
            return fmt.Errorf("write: %v", err)
        }
    }
}
```

::: tip
Learn more about the available functions on the [`gorilla/websocket` documentation](https://pkg.go.dev/github.com/gorilla/websocket#Conn).
:::

When using the built-in `Upgrader` and its `Upgrader.Handler()` function, the connection is closed automatically after the websocket `Handler` returns, using the closing handshake defined by RFC 6455 Section 1.4 if possible. If the websocket `Handler` returns an error, the `Upgrader`'s error handler will be executed and the close frame sent to the client will have status code 1011 (internal server error) and "Internal server error" as message. If debug is enabled, the message will be set to the one of the error returned by the websocket `Handler`. Otherwise the close frame will have status code 1000 (normal closure) and "Server closed connection" as a message.

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
