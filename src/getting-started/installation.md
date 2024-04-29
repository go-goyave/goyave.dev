---
title: "Installation"
description: "This guide will walk you through the installation process. You can either bootstrap your project using the Goyave template project, or manually set it up."
---

# Installation

This guide will walk you through the installation process. You can either bootstrap your project using the Goyave template project as explained below, or manually set it up.

[[toc]]

## Template project

The [Goyave template project](https://github.com/go-goyave/goyave-template) will help you get started in a few seconds. It provides a complete directory structure and scaffolding so you can start building right away. It contains a minimal setup so you won't have to clean up things you don't need.

### Linux / MacOS

```sh
$ curl https://goyave.dev/install.sh | bash -s github.com/username/projectname
```
:::info Tip
Replace `github.com/username/projectname` with your module's name.
:::

### Windows (Powershell)

```powershell
> & ([scriptblock]::Create((curl "https://goyave.dev/install.ps1").Content)) -moduleName github.com/username/projectname
```
:::info Tip
Replace `github.com/username/projectname` with your module's name.
:::

---

Run `go run .` in your project's directory to start the server. The server should start without error.

However, no route is registered. You can add a simple "hello world" route like so:

```go
// http/route/route.go
router.Get("/hello", func(response *goyave.Response, _ *goyave.Request) {
	response.String(http.StatusOK, "Hello world")
})
```

Restart your server, then try to request the `hello` route. Learn more about routing [here](/basics/routing.html).
```sh
$ curl http://localhost:8080/hello
```

Now that your project is ready, let's start customizing it with the [configuration](/getting-started/configuration.html).

## From scratch

If you decide to install your project from scratch, for example if you don't plan on using some of the framework's features or if you want to use a different directory structure, you can! However, please consider adhering to the [standard directory structure](/getting-started/architecture.html#directory-structure).

In your terminal, run the following after changing your working directory to your project's root directory:
```sh
$ go mod init github.com/username/projectname
$ go get -u goyave.dev/goyave/v5
```
:::info Tip
Replace `github.com/username/projectname` with your module's name.
:::

Now that your project directory is set up and the dependencies are installed, let's start with the program entry point, `main.go`:

```go
package main

import (
	"fmt"
	"os"

	"github.com/username/projectname/http/route"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/util/errors"
)

func main() {
	opts := goyave.Options{}

	server, err := goyave.New(opts)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}

	server.Logger.Info("Registering hooks")
	server.RegisterSignalHook()

	server.RegisterStartupHook(func(s *goyave.Server) {
		s.Logger.Info("Server is listening", "host", s.Host())
	})

	server.RegisterShutdownHook(func(s *goyave.Server) {
		s.Logger.Info("Server is shutting down")
	})

	server.Logger.Info("Registering routes")
	server.RegisterRoutes(route.Register)

	if err := server.Start(); err != nil {
		server.Logger.Error(err)
		os.Exit(2)
	}
}
```
:::tip
`server.Start()` is blocking. It will return when the server shuts down or if it fails starting.
:::

Now we need to create the package in which we will register our routes. Create a new package `http/route` and `http/route/route.go`:

```go
package route

import (
	"net/http"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/cors"
	"goyave.dev/goyave/v5/middleware/parse"
	"goyave.dev/template/http/controller/user"
)

func Register(_ *goyave.Server, router *goyave.Router) {
	router.Get("/hello", func(response *goyave.Response, request *goyave.Request) {
		response.String(http.StatusOK, "Hello world")
	})
}
```

Here we registered a very simple route displaying "Hello world". Learn more about routing [here](/basics/routing.html).

Finally, create a blank config file `config.json` containing an empty JSON object: `{}`. You can find more information about configuration in the next page.

You can run your server and request your route:
```sh
$ go run .
```

In another terminal:
```sh
$ curl http://localhost:8080/hello
```