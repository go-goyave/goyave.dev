---
title: "Middleware"
description: "Middleware are components with a single handler executed before and/or after the controller handler. They are a convenient way to filter, intercept or alter HTTP requests entering your application."
---

# Middleware

[[toc]]

## Introduction

Middleware are **components** with a **single handler** executed before and/or after the controller handler. They are a convenient way to filter, intercept or alter HTTP requests entering your application.

For example, middleware can be used to authenticate users. If the user is not authenticated, a message is sent to the user even before the controller handler is reached. However, if the user is authenticated, the middleware will pass to the next handler. Such middleware is called **blocking**. It may or may not pass to the next handler, which is either another middleware or controller handler. Blocking middleware thus act as a sort of conditional gate. 

Middleware can also be used to sanitize user inputs, by trimming strings for example, to log all requests into a log file, to automatically add headers to all your responses, etc.

## Writing middleware

Each middleware is written in its own file inside the `http/middleware` package. 

```go
type MyMiddleware struct {
	goyave.Component
}

func (m *MyMiddleware) Handle(next goyave.Handler) goyave.Handler {
	return func(response *goyave.Response, request *goyave.Request) {
		// Do something before the next handler in the stack
		next(response, request)
		// Do something after the controller handler returned
	}
}
```

If you want your middleware to be **blocking**, don't call `next()`. This way, the middleware will stop the request and respond immediately before reaching the controller handler. In the following example, consider that you developed a custom authentication system:

```go
type CustomAuth struct {
	goyave.Component
}

func (m *CustomAuth) Handle(next goyave.Handler) goyave.Handler {
	return func(response *goyave.Response, request *goyave.Request) {
		if !auth.Check(request) {
            response.Status(http.StatusUnauthorized)
            return
        }
		next(response, request)
	}
}
```

## Built-in middleware

The framework provides some optional middleware.

### Parse

```go
import "goyave.dev/goyave/v5/middleware/parse"

router.GlobalMiddleware(&parse.Middleware{
	MaxUploadSize: 10, // in MiB (defaults to the value provided in the config "server.maxUploadSize")
})
```

This middleware is reading and parsing the raw request query and body.

First, the query is parsed using Go's standard `url.ParseQuery()`. After being flattened (single value arrays converted to non-array), the result is put in the request's `Query`. If the parsing fails, it returns `400 Bad request`.

The body is read only if the `Content-Type` header is set. If the body exceeds the configured max upload size (in MiB), `413 Request Entity Too Large` is returned. If the content type is `application/json`, the middleware will attempt to unmarshal the body and put the result in the request's `Data`. If it fails, it returns `400 Bad request`.

This middleware depletes the request's body reader. You cannot read `request.Body()` to access the unparsed data afterwards.

If the content-type has another value, Go's standard `ParseMultipartForm` is called. The result is put inside the request's `Data` after being flattened. If the form is not a multipart form, attempts `ParseForm`. If `ParseMultipartForm` or `ParseForm` return
an error, returns `400 Bad request`.

In `multipart/form-data`, all file parts are automatically converted to `[]fsutil.File`. Inside `request.Data`, a field of type "file" will therefore always be of type `[]fsutil.File`. It is a slice so it support multi-file uploads in a single field.

The middleware is skipped if the matched route is the "not found" or "method not allowed" route.

### Compress

```go
import (
	"compress/gzip"

	"goyave.dev/goyave/v5/middleware/compress"
)

compress := &compress.Middleware{
	Encoders: []compress.Encoder{
		&compress.Gzip{
			Level: gzip.BestCompression,
		},
	},
}
router.Middleware(compress)
```

This middleware compresses HTTP responses and supports multiple algorithms thanks to the `compress.Encoders` slice.

The encoder will be chosen depending on the request's `Accept-Encoding` header, and the value returned by the `Encoder`'s `Encoding()` method. Quality values in the headers are taken into account.

If the header's value is `*`, the first element of the slice is used. If none of the accepted encodings are available in the `Encoders` slice, then the
response will not be compressed and the middleware immediately passes.

If the middleware successfully replaces the response writer, the `Accept-Encoding` header is removed from the request to avoid potential clashes with potential other encoding middleware.

If not set at the first call of `Write()`, the middleware will automatically detect and set the `Content-Type` header using `http.DetectContentType()`.

The middleware ignores hijacked responses or requests containing the `Upgrade` header.

#### Custom encoder

You can easily implement encoders if you need to support more compression methods. Create a new structure implementing `compress.Encoder` interface.

For example, the gzip encoder is implemented like so:
```go
import (
	"compress/gzip"

	"goyave.dev/goyave/v5/util/errors"
)

type Gzip struct {
	Level int
}

func (w *Gzip) Encoding() string {
	return "gzip"
}

func (w *Gzip) NewWriter(wr io.Writer) io.WriteCloser {
	writer, err := gzip.NewWriterLevel(wr, w.Level)
	if err != nil {
		panic(errors.New(err))
	}
	return writer
}
```

### Access logs

```go
import "goyave.dev/goyave/v5/log"

router.GlobalMiddleware(log.CombinedLogMiddleware())
// or
router.GlobalMiddleware(log.CommonLogMiddleware())
```

To enable logging of accesses using the [Common Log Format](https://en.wikipedia.org/wiki/Common_Log_Format), simply register the `CommonLogMiddleware`. Alternatively, you can use `CombinedLogMiddleware` for Combined Log Format.

The logs are output in a structured format. The message itself is formatted as the standard defines. Attributes are attached to the log entry for each piece of information (host, time, method, uri, proto, status, length, etc) in an attribute group named "details".

If debug is enabled (config `app.debug`), only the message is output to avoid clutter.

#### Custom formatter

You can create your own formatter for access logs by implementing a function of type `log.Formatter` (`func(ctx *Context) (message string, attributes []slog.Attr)`):

```go
func CustomFormatter(ctx *log.Context) (string, []slog.Attr) {
	method := ctx.Request.Method()
	uri := ctx.Request.URL().RequestURI()
	message: = fmt.Sprintf("%s %s", method, uri)

	details := slog.Group("details",
		slog.String("method", req.Method),
		slog.String("uri", uri),
	)

	return message, []slog.Attr{details}
}
```
```go
import "goyave.dev/goyave/v5/log"

router.GlobalMiddleware(&log.AccessMiddleware{Formatter: CustomFormatter})
```