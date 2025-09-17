---
title: "Status handlers"
description: "Status handlers are components implementing a regular handler which is executed during the finalization step of the request's lifecycle if the response body is empty but a status code has been set."
---

# Status handlers

[[toc]]

## Introduction

**Status handlers** are **components** similar to controllers, implementing a regular handler which is executed during the **finalization** step of the request's lifecycle if the **response body is empty** but a status code has been set. Status handler are mainly used to implement a custom behavior for user or server errors (respectively `400` and `500` status codes). In short, status handlers are a centralized way of handling one or several response status codes.

Goyave comes with three built-in status handlers that are defined by default:
- `goyave.PanicStatusHandler`: for errors and panics (`500`)
- `goyave.ErrorStatusHandler`: for non-success codes (`400` codes, `501`+ codes)
- `goyave.ValidationStatusHandler`: for `422 Unprocessable Entity` (validation errors)

The panic and error handlers returns a simple error message corresponding to the status code.
```json
{
	"error": "Not Found"
}
```

::: info
The `500` status handler is an exception: it will still be executed if an error or panic occurs after a write. 
:::

## Implementing a status handler

Status handlers are implemented in the `http/controller/status` package. If your status handlers are quite large, split them in multiple files, otherwise you can implement them all in a `status.go` file.

Status handlers are structures that must implement the `goyave.StatusHandler` interface. This interface requires your structure to be a `goyave.Component` and implement a method `Handle(*Response, *Request)`.

**Example:**
```go
package status

import (
	"goyave.dev/goyave/v5"
)

type CustomHandler struct {
	goyave.Component
}

func (*CustomHandler) Handle(response *goyave.Response, request *goyave.Request) {
	message := map[string]string{
		"message": request.Lang.Get("customStatusHandlerResponse"),
	}
	response.JSON(response.GetStatus(), message)
}
```

:::warning
Status handlers are executed **outside** of the handler stack since they are part of the **finalization** step. Therefore, they are **not protected** by the recovery middleware. Take extra care building your status handlers to make sure they never `panic`.
:::

:::info Note
If your status handler doesn't write anything to the response body, the status code **won't** be changed to `204 No Content`.
:::

### Expanding default status handlers

You can expand default status handlers by **compositing** with them. This is useful if you want to keep the default behavior and just add some custom operations. For example if you want to use an error tracking service:

```go
type ErrorHandler struct {
	goyave.PanicStatusHandler
}

func (h *ErrorHandler) Handle(response *goyave.Response, request *goyave.Request) {
	errortracker.Notify(response.GetError())

	h.PanicStatusHandler.Handle(response, request)
}
```

## Registering status handlers

Status handlers are registered in the **router**.

```go
func Register(_ *goyave.Server, router *goyave.Router) {
	router.StatusHandler(&status.ErrorHandler{}, http.StatusInternalServerError)
	router.StatusHandler(&status.CustomHandler{}, 401, 402, 403)
	//...
}
```

:::tip
Status handlers are inherited as a clone in subrouters. Modifying a subrouter's status handler will not modify its parent's. That means that you can define different status handlers for certain route groups if you so desire and that you should register your status handlers before your subrouters.
:::
