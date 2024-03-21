---
title: "Architecture"
description: "Architecture description"
---

# Architecture

[[toc]]

## Introduction

Understanding your development tools and knowing what happens in the background is crucial. Mastering your tools and environment incredibly decreases the risk of errors, eases debugging and helps making your code work in harmony with the framework. The goal of this section is to give you an overview of the general functioning and design of the framework, to make you more comfortable and confident using it.

## Terminology

This section will briefly explain some of the technical words used throughout the documentation. Feel free to refer to it if you are unsure what a term means while reading the documentation.

**Lifecycle**: An execution from start to finish, with intermediary steps.

**Component**: A structure part of the presentation layer (HTTP/REST) implementing the `goyave.Composable` interface, which allows them to access essential server resources. A component can be parent of several sub-components.

**Handler**: A function receiving incoming requests and a response writer. Multiple handlers can be executed for the same request.

**Controller**: A structure implementing one or multiple handlers. A controller's responsibility is limited to the presentation layer.

**Middleware**: A handler executed before controller handlers. Middleware can intercept the request, modify its data, and send a response before the controller handler is reached.

**Router**: The root-level handler responsible for parsing the request URI and matching the corresponding route.

**Route**: A URI definition linked to a controller handler. If this route matches an incoming request, the router will execute the associated controller handler.

**Application**: A program using the Goyave framework as a library.

**Model**: A structure reflecting a database table structure. An instance of a model is a single database record.

**Repository**: A structure implementing methods used to abstract database operations for a resource.

**Seeder**: A function which creates a number of random records in the database.

**Migration**: In the context of the database (or data layer), refers to an incremental schema modification (creating a table, adding/removing a column, etc).

**Layer**: An isolated part of the code with a specific responsibility. Layers communicate with each other but they don't directly depend on each other.

**DTO**: Data Transfer Object. A structure carrying data between several layers.

**Service**: A structure implementing either business logic (e.g. `UserService` manages the `User` resource) or an abstraction to a feature (e.g.: `AuthService` manages authentication) or external dependency (e.g.: other microservice, third-party API)

## Lifecycle

### Initialization

The very first step of the application lifecycle is about loading resources and [configuration](/getting-started/configuration.html). It is either done manually by the application developer, or handled by the framework automatically by default when creating the server with `goyave.New()`. 

- `goyave.New()`
	- The application's configuration file is then loaded, overriding the default values.
	- The [language](/advanced/localization.html) files are loaded. The `en-US` language is available by default inside the framework and is used as the default language. The framework will look for custom language files inside the working directory, load the available languages and will override the `en-US` language entries if needed.
	- The HTTP server is initialized but it **doesn't** listen on the network yet. The network listener is only created when `server.Start()` is called later. The router is also created but doesn't contain any route yet. Under the hood, Goyave uses `net/http`'s `*http.Server`. The router is therefore implementing `http.Handler`. 
	- The database connection pool is created if the configuration doesn't specify `none` as the database connection type.
- Optionally, the OS signal hook is registered for graceful shutdown on `SIGINT` or `SIGTERM`. Other hooks such as startup and shutdown hooks can also be registered.
- Services are initialized and registered.
- Routes are registered.
- `goyave.Start()` starts the server.
	- The network listener is created.
	- The HTTP starts serving requests.
	- A goroutine is started and all startup hooks are executed (in order of registration) inside it.
	- **Note**: `server.Start()`, `server.Stop()`, `server.IsReady()` are concurrently safe operations.

### Requests

This section will explain the lifecycle of an incoming HTTP request.

#### Routing

When a request is received, the router's `ServeHTTP()` method is called. The router tries to **match** it with a registered route using the request's URI and method. At the same time, it parses the potential route parameters and stores them for future use by the handlers. The router matching algorithm is explained in more details in the [routing documentation](/basics/routing.html).

There are two **special routes**: "Not found" and "Method not allowed". They are explained in more details in the [routing documentation](/basics/routing.html). Therefore, the router **always** executes a route when it receives a request.

#### Wrapping

Once the router has decided which route to execute, two wrapper objects are created. These elements are fundamental features of the framework:
- `*goyave.Request`: used to retrieve the request information and body reader. It can also store extra request-scoped information such as the authenticated user, validation error, etc, which are then propagated to all handlers in the life of a request. 
- `*goyave.Response`: used to write the response.

#### Handler stack

Next, a handler **stack** is generated. At the top of the stack, we have the **global middleware** (middleware that is executed for every request, even if the matched route is "Not found" or "Method not allowed"). Then the middleware inherited from parent routers. Under them, we have the middleware applied specifically to the matched route. And finally at the bottom of the stack, we have the controller handler. The execution starts from the top of the stack, goes down then up again. This means middleware can also execute code **after** the controller handler returns if they want to.

:::center
![Middleware stack diagram](/diagrams/middleware_stack.webp){data-zoomable}
:::

The framework includes two built-in global middleware that are always registered in any router: the **recovery** and **language** middleware.

**Recovery:** This middleware ensures that any unrecovered panic is handled. Instead of never returning a response in case of a panic, the server will then [wrap](/advanced/error-handling.html) the error, log it, and set the response status to `500 Internal Server Error`, therefore triggering the execution of the associated [**status handler**](/advanced/status-handlers.html), which will gracefully handle the error.

**Language:** The `Accept-Language` header is checked. If it's there, its value is parsed and the request's language field is set accordingly so localization is easy in the following handlers. If the header is missing, invalid, or asks for an unsupported language, the framework falls back to the default language defined in the configuration. Learn more [here](/advanced/localization.html).

#### Finalization

When the top of the stack returns, the request's enters the **finalization** stage.
- `204 No Content` is written if the response is empty and no status has been set.
- If a status code has been defined for the response but the response body is empty, then the [**status handler**](/advanced/status-handlers.html) associated with this code will be executed if it exists. In short, status handlers are a centralized way of handling one or several response status codes.
- Finally, the response writer is closed. Learn why it is important in the [chained writer documentation](/basics/response.html#chained-writers).

### Responses

Goyave provides a [chained writer system](/basics/response.html#chained-writers), which allows multiple writers to read or alter the raw response body. For example, you can add a `gzip` writer in the chain so your responses will be compressed without having to specify it in your handlers. Another use-case would be for logging: the writer would read the response body to know its length, without altering it, and print the result when the writer is closed in the finalization phase.

:::tip Note
It is important to keep in mind that all writes always first go through the `*goyave.Response`.
:::

Usually, the response's writer is replaced in a middleware. The current writer is taken from the `*goyave.Response`, and used as destination for the newly created chained writer. This new chained writer is then set in `*goyave.Response`.

:::center
![Chained writers diagram](/diagrams/chained_writers.webp){data-zoomable}
:::

The writers are **closed** at the end of the **finalization stage**, telling them that the application is entirely done with this request.

#### Pre-write

There is `PreWrite()` hook allowing to alter the response headers or status before the response HTTP headers are written. Once written, they are locked until the end of the request's life: only the body can be written to. This allows the framework to only send the status header when something is being written to the body or when the request is finalized.

For example, the `gzip` chained writer would ensure a `Content-Type` header deduced from the uncompressed data is set before the body is actually written.  

### Shutdown

The server stops when `server.Stop()` is called, when the OS signal handler (if setup) is triggered, or when the underlying `http.Server` returns an error. Active connections are not interrupted but new connections won't be accepted.

`server.Start()` returns after the execution of all **shutdown hooks** in the order of registration. Shutdown hooks are executed in the same goroutine as the one that called `server.Start()`. If there is any, the database connection is cleanly closed as well.

:::tip
You should always make sure that your program exits **after** `server.Start()` returns for a graceful shutdown.
:::

## Overview

This section will explain the general **architecture of a Goyave application**. The application is split in **three distinct layers**:
- **Presentation**: HTTP/REST layer, it's your application's facade.
- **Domain/Business**: contains **services**
- **Data**: interacts with the database with **repositories** and contains the models

Each layer **doesn't directly depend** on the others because they define **interfaces** representing their own needs. The following chart describes the usual flow of a request into a Goyave application.

:::center
![Architecture overview diagram](/diagrams/architecture_overview.webp){data-zoomable}
:::

This architecture has several advantages:
- Good separation of concerns and no direct dependency
- Easily testable
- The data layer doesn't leak into the business layer even if there are transactions involved
- Lowers the risk of exposing information that is not meant to be public
- Easily readable, explorable and maintainable
- Because nothing is global, it eliminates the costly need for goroutine synchronization

### DTO

The presentation and domain layers communicate with structures named **DTO** (Data Transfer Object). Once the input data is validated and sanitized, the presentation layer will convert it to a DTO and pass it to the domain layer.

DTOs are defined in their own separated package, since they are indeed objects used for communicating between different layers. The framework provides several tools to make these conversions painless. Learn more in the [DTO and model mapping documentation](/advanced/dto-and-model-mapping.html).

### Presentation layer (HTTP/REST)

The presentation layer is your application's facade, it's door to the world outside of it. Its purpose is to ensure **input data integrity** and proper **response formatting and content**. It contains all the code that is related to the HTTP protocol. 

#### Components

In Goyave, **nothing is global**. This means that a mechanism is necessary so the server's essential resources (such as the configuration, logger, etc) can be distributed to every component of the server. This mechanism is actually called **Components**, and described by the interface `goyave.Composable`.

Most structures in the presentation layer actually are **Goyave components**. A structure is easily turned into a component by **compositing** the `goyave.Component` structure. A component can be parent of several sub-components. Components are initialized by the framework with an `Init()` method.

### Domain/Business layer

In this layer, the **services** are implemented. This is where the core logic and value of your application resides. A service is structure implementing either business logic (e.g. `UserService` manages the `User` resource) or an abstraction to a feature (e.g.: `AuthService` manages authentication) or external dependency (e.g.: other microservice, third-party API).

This layer is making a bridge between the two other layers. It takes DTOs as input and returns DTOs as output. When it needs to communicate with the data layer, it uses models.

:::warning
It is important that the domain layer never leaks models!
:::

#### Session

The services can take advantage of the [session mechanism](/advanced/transactions.html) provided by the framework. This system is creating an abstraction of a transaction system (be it a database or not) so the services can define and control business transactions without directly interacting with the database.

:::info
A transaction is an operation made of multiple steps. The final result is validated and written to the database only if all the steps succeed. In this case, we say the transaction is **committed**. If one of step fails, the transaction is **rolled back**.
:::

Therefore, the repositories, explained in the next section, do not need to worry about working from inside a transaction or not. This way, services can call multiple repository operations, in any order, and potentially from mutliple different repositories or even from other services, while keeping control on their own business transaction.

### Data layer

The data layer contains the **models**, the **repositories** and all the code related to your data. The **models** are a Go representation of your database schema. The **repositories** implement the methods that will be called to work with the data (fetch, create, update, delete, etc).

:::info
Goyave is built with the [Gorm ORM](https://gorm.io/). This doesn't prevent you from using raw SQL if you need to.

Database connections are managed by the framework and are long-lived (pool). When the server shuts down, the database connections are closed automatically. So you don't have to worry about creating, closing or refreshing database connections in your application.
:::

## Dependency injection

Goyave doesn't use anything complex for dependency injection. **Only native Go and no code generation.**

### For the presentation layer

For **components**, the server dependency is automatically injected with the `Init()` method when the framework receives a component from any of its functions.

Goyave provides a simple **dependency container for services** that components can access from the server at any time (ideally from their `Init()` method). In the initialization phase of the lifecycle, the services are created and registered in this container.  

### For business layer

Repositories and services are created at initialization. They don't use the dependency container because they don't depend on the Goyave server. Instead, they take their dependencies as `New()` constructor parameters, in the form of interfaces they define.

:::info
You can learn more about this system in the [services documentation](/basics/services.html).
:::

## Directory structure

Here is the **recommended directory structure** for Goyave applications:

:::mono
.
├── database (__*Data layer*__)
│   ├── model
│   │   ├── user.go
│   │   └── *...*
│   ├── repository
│   │   └── *...*
│   └── seed (*optional*)
│       └── seed.go
├── dto
│   ├── user.go
│   └── *...*
├── http (__*Presentation layer*__)
│   ├── controller
│   │   └── user
│   │       ├── user.go
│   │       └── validation.go
│   ├── middleware
│   │   └── *...*
│   ├── route
│   │   └── route.go
│   └── validation
│       └── *...*
├── resources
│   └── lang
│       └── en-US (*language name*)
│           ├── fields.json (*optional*)
│           ├── locale.json (*optional*)
│           └── rules.json (*optional*)
├── service (__*Domain layer*__)
│   ├── user
│   │   └── user.go
│   └── service.go
├── .gitignore
├── config.json
├── go.mod
├── go.sum
├── main.go
└── README.md
:::

- `dto` contains the definition of the DTO structures. Each feature should have one file.
- `http`
	- The `http/controller` directory contains the controller packages. Each feature should have its own package. For example, if you have a controller handling user registration, user profiles, etc, you should create a `http/controller/user` package. 
	- Controller packages typically contain to files:
		- `<feature>.go`: contains the controller implementation
		- `validation.go`: contains the validation rules for this feature
	- The `http/middleware` directory contains the application middleware. Each middleware should have its own file.
	- The `http/route` directory contains the main route registrer function in `route.go`. This file usually doesn't grow too big since routes can be registered from controllers themselves.
	- The `http/validation` directory contains custom validators.
- `resources`: The resources directory is meant to store static resources such as images and language files. This directory shouldn't be used as a storage for dynamic content such as user profile pictures.
	- The `resources/lang` directory contains your application's supported languages and translations. Each language has its own directory and should be named with an [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language code. You can also append a variant to your languages: `en-US`, `en-UK`, `fr-FR`, `fr-CA`, ... **Case is important.**
	- Each language directory contains three files. Each file is **optional**.
		- `fields.json`: field names translations and field-specific rule messages.
		- `locale.json`: all other language lines.
		- `rules.json`: validation rules messages.
- `service`: contains the services implementations.
	- Each service should have its own package.
	- The `service/service.go` file contains a list of constants for the names of all your services.