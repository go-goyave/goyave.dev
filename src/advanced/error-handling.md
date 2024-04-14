---
title: "Error handling"
description: "Error handling is crucial for the resilience and ease of debugging of your application. Goyave provides advanced error wrapping to help you."
---

# Error handling

[[toc]]

## Introduction

Errors in Go can be a bit light on information, which makes it hard to find exactly what happened. Even more so when the error is reported on an error tracking service from a production environment.

The framework provides a convenient error wrapping mechanism in the package `goyave.dev/goyave/v5/util/errors`, which brings the following advantages:
- The **callers** are collected right when the error happens, allowing to precisely locate the exact origin of all errors.
- Multiple errors can be wrapped into one single error.
- Any error **reason** can be used, be it a `string`, a `struct`, another `error`, `map`, `[]error`, `[]any`, etc.
- More information can be attached to an error, which can be useful for use with **error reporting services**.
- The wrapper is handled by the **structured logger**, which results in more detailed logs. The error reasons are automatically converted to `slog` attributes.
	- In dev mode, the error reason(s) and stacktrace(s) will be displayed in a format easily readable by humans.
	- In production, the error reason(s) and stacktrace(s) will be marshaled into JSON and added to the resulting log entry.
	- The `trace` attribute will contain the stack frames.
	- The `message` will contain the result of the `Error()` function, which is the message of all wrapped errors joined by a line break (`\n`).
	- If the error reason is a custom error type implementing `slog.LogValuer`, a `reason` attribute will be added and will contain the value returned by `LogValue()`.
- The wrapper supports nested errors: it can wrap errors that wrap other errors.

Below is a diagram explaining the overall error wrapping flow:
:::center
![Error wrapping diagram](/diagrams/error_handling.webp){data-zoomable}
:::

## Guidelines

- `panic` is **discouraged** but can still be used in certain cases.
- Any error returned should be **wrapped** using `errors.New()`.
	- If you are developing a library, you can use `errors.NewSkip()` to skip the first stack frames and return a stack trace that points to the call of your library function instead of code inside your library.
- Bring errors up the stack as much as possible, usually up the controller handler.
- Use `response.Error()` to report the error. This will log the error and set the response status to `http.StatusInternalServerError`. In debug mode, the error will be written to the response body, otherwise the corresponding [**status handler**](#status-handler) will be executed.
```go
func (ctrl *Controller) Show(response *goyave.Response, request *goyave.Request) {
	err := ctrl.Service.SomeProcess()
	if err != nil {
		response.Error(err)
		return
	}
	//...
}
```

In the following example, we call `HighLevelFunc()` and expect `someProcess()` to return an error. Because we wrap the error as soon as it is returned, the stack trace will point precisely to where the error originates from.

```go{13}
import (
	//...
	"goyave.dev/goyave/v5/util/errors"
)

func HighLevelFunc() error {
	err := SomeFunc()
	if err != nil {
		return errors.New(err)
	}
	//...
	return nil
}

func SomeFunc() error {
	value, err := someProcess()
	if err != nil {
		return errors.New(err) // Trace will point to here
	}
	//...
	return nil
}
```

:::info
- When `errors.New()` receives a reason that is already wrapped (`*errors.Error`), the reason is returned without change. The trace is therefore not modified and no information is lost.
- It is however a good practice to always use the wrapper, so you are certain your errors are always wrapped at some point.
- `errors.New(nil)` returns `nil`. If the reason is `[]error` or `[]any`, the `nil` elements are ignored.
- `*errors.Error.Error()` returns the error message only without the stack trace. If you are using this type outside of the framework's slogger context, prefer using `*errors.Error.String()`.
:::

## Recovery middleware

Goyave has a built-in global middleware that ensures all unrecovered `panic` are gracefully **recovered**. When this middleware recovers from a `panic`, it will **wrap** it if not already wrapped, then **log** it. Finally, the response status is set to `http.StatusInternalServerError`, and the [status handler](/advanced/status-handlers.html) for this code is executed.

This mechanism ensures the resilience of your application, because a proper response will always be sent to the client. Moreover, it helps solving unexpected panics thanks to the same precision a regular wrapped error would have.

## Status handler

When an error is generated inside the **request lifecycle**, be it from a `panic` recovered by the recovery middleware or an error reported with `response.Error()`, the [status handler](/advanced/status-handlers.html) associated with the `500` status code will be executed.

The default status handler for errors can be replaced with your own, letting you **handle errors in a centralized way**. This is helpful if you want to report your errors to an **error tracking service**.

```go{7}
// http/controller/status/status.go
type PanicStatusHandler struct {
	goyave.Component
}

func (*PanicStatusHandler) Handle(response *goyave.Response, _ *goyave.Request) {
	errortracker.Notify(response.GetError())

	message := map[string]string{
		"error": http.StatusText(response.GetStatus()),
	}
	response.JSON(response.GetStatus(), message)
}
```

:::warning
- Don't forget a `*errors.Error` may wrap several errors. To make sure all the wrapped errors are properly reported in your error tracker, make use of `err.Len()` and `err.Unwrap()`.
- Although `*errors.Error` implements methods frequently used by error reporting services, such as `Callers() []uintptr`, and should work out-of-the-box with many of these service, the one you are using may not. Make use of `err.FileLine()`, `err.StackFrames()`, `err.Callers()` to feed your error tracker all the information it needs.
:::
