---
title: "Logging"
description: "Goyave unifies logging with a wrapper of Go's standard structured logging."
---

# Logging

[[toc]]

## Introduction

Goyave **unifies** logging with a custom wrapper of [Go's standard `*slog.Logger`](https://go.dev/blog/slog). Logs coming from the framework, from Gorm and from your application are all handled by the same system, with the same output `io.Writer`, with a consistent format.

Structured logging, on top of providing rich and easily parseable contents, allows you to use **log levels**: `Debug`, `Info`, `Warn` and `Error`.

:::info
- By default, the `slog.Handler` used will be Go's standard `*slog.JSONHandler`.
- In **dev mode**, (config `app.debug = true`), the logger will use a custom handler that formats the data in a human-readable way.
- The Goyave wrapper enriches logs of errors using [the framework's error system](/advanced/error-handling.html).
- All options and settings of the standard library can be applied to the wrapper.
- By default, the output for all logs is `os.Stderr`.
:::

## Custom slog handler

Custom handlers must implement the [`slog.Handler`](https://pkg.go.dev/log/slog#Handler) interface. Here is an example of a very simple custom slog handler:
```go
import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"sync"

	"goyave.dev/goyave/v5/util/errors"
)

type CustomHandlerOptions struct {
	Level slog.Leveler
}

type CustomHandler struct {
	opts   *CustomHandlerOptions
	mu     *sync.Mutex
	w      io.Writer
	attrs  []slog.Attr
	groups []string
}

func NewCustomSlogHandler(w io.Writer, opts *CustomHandlerOptions) *CustomHandler {
	if opts == nil {
		opts = &CustomHandlerOptions{}
	}
	return &CustomHandler{
		w:    w,
		mu:   &sync.Mutex{},
		opts: opts,
	}
}

func (h *CustomHandler) Handle(_ context.Context, r slog.Record) error {

	buf := bytes.NewBuffer(make([]byte, 0, 1024))

	buf.WriteString(r.Level.String())
	buf.WriteRune(' ')
	buf.WriteString(r.Message)

	// Add attrs and groups...

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := h.w.Write(buf.Bytes())
	return errors.New(err)
}

func (h *CustomHandler) Enabled(_ context.Context, level slog.Level) bool {
	minLevel := slog.LevelInfo
	if h.opts.Level != nil {
		minLevel = h.opts.Level.Level()
	}
	return level >= minLevel
}

func (h *CustomHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, 0, len(h.attrs)+len(attrs))
	newAttrs = append(newAttrs, h.attrs...)
	newAttrs = append(newAttrs, attrs...)
	return &CustomHandler{
		opts:   h.opts,
		w:      h.w,
		mu:     h.mu,
		attrs:  newAttrs,
		groups: h.groups,
	}
}

func (h *CustomHandler) WithGroup(name string) slog.Handler {
	return &CustomHandler{
		opts:   h.opts,
		w:      h.w,
		mu:     h.mu,
		attrs:  append(make([]slog.Attr, 0, len(h.attrs)), h.attrs...),
		groups: append(h.groups, name),
	}
}

```

You can then use your custom handler by setting it in the server's `Options`:
```go
import (
	//...
	stdslog "log/slog"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/slog"
)

func main() {
	slogHandler := NewCustomSlogHandler(os.Stderr, &CustomHandlerOptions{Level: stdslog.LevelDebug})
	slogger := slog.New(slogHandler)

	opts := goyave.Options{
		Logger: slogger,
	}

	server, err := goyave.New(opts)
	if err != nil {
		slogger.Error(err)
		os.Exit(1)
	}
	//...
}
```