---
title: "CORS"
description: "Goyave provides an easy way of handling CORS in your applications."
---

# CORS

[[toc]]

## Introduction

CORS, or "[Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)" is a mechanism that uses additional HTTP headers to tell browsers to give a web application running at one origin, **access to selected resources from a different origin**. A web application executes a cross-origin HTTP request when it requests a resource that has a different origin (domain, protocol, or port) from its own. Enabling CORS is done by adding a set of specific headers allowing the browser and server to communicate about which requests, methods and headers are or are not allowed. CORS support also comes with **pre-flight** `OPTIONS` requests support.

Most of the time, the API is using another domain as the clients. For security reasons, browsers restrict cross-origin HTTP requests initiated from scripts. That's why you should configure CORS for your API.

## Enabling CORS

CORS settings can be configured on **routers**, and are inherited by subrouters through the **router's meta**. The CORS middleware is automatically added **globally**.

```go
import (
	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/cors"
)

func Register(_ *goyave.Server, router *goyave.Router) {
	router.CORS(cors.Default())
	//...
}
```

:::info
- The options are added to the router's meta with the key `goyave.MetaCORS`.
- If CORS is enabled for the router, the `OPTIONS` method is automatically added to all its routes.
:::

CORS options should be defined **before middleware and route definition**. All of this router's subrouters **inherit** CORS options by default. If you want to remove the options from a subrouter, or use different ones, simply create another `cors.Options` object and assign it.

```go
router.CORS(cors.Default())

subrouter := router.Subrouter("/products")
subrouter.CORS(nil) // Remove CORS options for this subrouter only

options := cors.Default()
options.AllowCredentials = true
subrouter.CORS(options) // Different CORS options for this subrouter only
```

:::warning
- Don't use the default settings blindly. Although they are well suited for the most common cases, you may want to customize the `AllowedOrigins` and `AllowedHeaders`.
- Learn more about all the available options and their default values on the [go.pkg.dev reference](https://pkg.go.dev/goyave.dev/goyave/v5/cors#Options).
:::