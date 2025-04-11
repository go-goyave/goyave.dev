---
title: "Controllers"
description: "Controllers are components structures implementing one or more handlers. They are part of the presentation layer (HTTP/REST)."
---

# Controllers

[[toc]]

## Introduction

Controllers are **components** structures implementing one or more **handlers**. They are part of the **presentation layer** (HTTP/REST). Their responsibility is to:
- Get data from a request and format it properly: the raw request data is [converted to a DTO](/advanced/dto-and-model-mapping.html).
- Send it to the **services** that will handle the business logic and return a DTO.
- Use the result returned by the service to build an HTTP response.

As such, controllers should never implement their business logic themselves. Instead, they **depend on [services](/basics/services.html)**.

Each feature or resource should have its own package. For example, if you have a controller handling user registration, user profiles, etc, you should create a `http/controller/user` package.

:::info
Because controllers are **components**, they have access to all the server's essential resources through the composition of `goyave.Component`.
:::

Here is a full example of a simple CRUD controller. The service implementation, the DTO structures and the validation rule sets are not included in the example.

```go
// http/controller/product/product.go
package product

import (
	"context"
	"net/http"
	"strconv"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/database"
	"goyave.dev/goyave/v5/util/typeutil"
	"my-project/dto"
	"my-project/service"
)

type Service interface {
	GetByID(ctx context.Context, id int64) (*dto.Product, error)
	Paginate(ctx context.Context, page int, pageSize int) (*database.PaginatorDTO[*dto.User], error)
	Create(ctx context.Context, createDTO *dto.CreateProduct) (*dto.Product, error)
	Update(ctx context.Context, updateDTO *dto.UpdateProduct) error
	Delete(ctx context.Context, id int64) error
}

type Controller struct {
	goyave.Component
	ProductService Service
}

func (ctrl *Controller) Init(server *goyave.Server) {
	ctrl.ProductService = server.Service(service.Product).(Service)
	ctrl.Component.Init(server)
}

func (ctrl *Controller) RegisterRoutes(router *goyave.Router) {
	subrouter := router.Subrouter("/products")

	subrouter.Get("/", ctrl.Index).ValidateQuery(IndexRequest)
	subrouter.Post("/", ctrl.Create).ValidateBody(CreateRequest)
	subrouter.Get("/{productID:[0-9+]}", ctrl.Show)
	subrouter.Patch("/{productID:[0-9+]}", ctrl.Update).ValidateBody(UpdateRequest)
	subrouter.Delete("/{productID:[0-9+]}", ctrl.Delete)
}

func (ctrl *Controller) Index(response *goyave.Response, request *goyave.Request) {
	query := typeutil.MustConvert[*dto.Index](request.Query)

	paginator, err := ctrl.ProductService.Paginate(request.Context(), query.Page.Default(1), query.PerPage.Default(20))
	if response.WriteDBError(err) {
		return
	}

	response.JSON(http.StatusOK, paginator)
}

func (ctrl *Controller) Show(response *goyave.Response, request *goyave.Request) {
	productID, err := strconv.ParseInt(request.RouteParams["productID"], 10, 64)
	if err != nil {
		response.Status(http.StatusNotFound)
		return
	}

	user, err := ctrl.ProductService.GetByID(request.Context(), productID)
	if response.WriteDBError(err) {
		return
	}

	response.JSON(http.StatusOK, user)
}

func (ctrl *Controller) Create(response *goyave.Response, request *goyave.Request) {
	createDTO := typeutil.MustConvert[*dto.CreateProduct](request.Body)

	product, err := ctrl.ProductService.Create(request.Context(), createDTO)
	if response.WriteDBError(err) {
		return
	}

	response.JSON(http.StatusCreated, map[string]int64{"id": product.ID})
}

func (ctrl *Controller) Update(response *goyave.Response, request *goyave.Request) {
	updateDTO := typeutil.MustConvert[*dto.UpdateProduct](request.Body)

	err := ctrl.ProductService.Update(request.Context(), updateDTO)
	response.WriteDBError(err)
}

func (ctrl *Controller) Delete(response *goyave.Response, request *goyave.Request) {
	productID, err := strconv.ParseInt(request.RouteParams["productID"], 10, 64)
	if err != nil {
		response.Status(http.StatusNotFound)
		return
	}

	err = ctrl.ProductService.Delete(request.Context(), productID)
	response.WriteDBError(err)
}
```

- First, we define the `Service` interface, which represent the controller's **dependencies**.
- In `Init()`, we get it from the server's service container: `server.Service(service.Product).(Service)`. `Init()` is a function automatically called by the framework when using `router.Controller()`. There is another way of injecting dependency that is explained [below](#dependency-injection). Learn more about services [here](/basics/services.html).
- It is not necessary to add `response.Status(http.StatusNoContent)` at the end of `Update` and `Delete` because the framework automatically sets the response status to `204` if its body is empty and no status has been set.
- Setting the `Content-Type` header is not necessary. `response.Write` automatically detects the content type and sets the header accordingly, if the latter has not been defined already.

## Naming conventions

- Controller packages are named after the resource they are mostly using, in a singular form. For example a controller for a `Product` model would be called `http/controller/product`. If a controller isn't related to a resource, then give it an expressive name.
- To avoid stutter, the controller structure is always named `Controller`. This way, creating the controller from the main route registrer is clean and easily readable: `&product.Controller{}`.
- Controller handlers are always **exported**. All functions which aren't handlers **must be unexported**.
- CRUD operations naming and routing:

| Method   | URI             | Handler name | Description                 |
|----------|-----------------|--------------|-----------------------------|
| `GET`    | `/product`      | `Index()`    | Get the products list       |
| `POST`   | `/product`      | `Create()`   | Create a product            |
| `GET`    | `/product/{id}` | `Show()`     | Show a product              |
| `PATCH`  | `/product/{id}` | `Update()`   | Update a product            |
| `PUT`    | `/product/{id}` | `Upsert()`   | Create or replace a product |
| `DELETE` | `/product/{id}` | `Delete()`   | Delete a product            |

## Dependency injection

There are two ways to inject a dependency in a controller. With both approaches, it is recommended to use an **interface** to define the dependency rather than the service type itself. This removes direct code dependency and helps writing tests.

### Using the service container

This method is well suited for use with `controller.Init()`, `controller.RegisterRoutes()` and `router.Controller()`. The controller will fetch its dependencies itself from the **service container** provided by the framework.

```go
// http/controller/product/product.go
type Controller struct {
	goyave.Component
	ProductService Service
}

func (ctrl *Controller) Init(server *goyave.Server) {
	ctrl.ProductService = server.Service(service.Product).(Service)
	ctrl.Component.Init(server)
}
```
```go
// http/route/route.go
func Register(server *goyave.Server, router *goyave.Router) {
	router.Controller(&product.Controller{})
}
```

:::tip
- Note that we type-assert using the interface and not the actual service type.
- Learn more about services and how to register them in the [dedicated section](/basics/services.html).
:::

### Using a constructor

If you don't want to use `controller.Init()`, `router.Controller()` and you prefer to register routes from inside the main route registrer rather than next to the controller, define a **constructor** for your controller that takes all of its dependencies as parameters:

```go
// http/controller/product/product.go
type Controller struct {
	goyave.Component
	ProductService Service
}

func NewController(server *goyave.Server, productService Service) *Controller {
	ctrl := &Controller{
		ProductService: productService,
	}
	ctrl.Init(server)
	return ctrl
}
```
```go
// http/route/route.go
func Register(server *goyave.Server, router *goyave.Router) {
	//...
	{
		ctrl := product.NewController(server, productService)
		productRouter := router.Subrouter("/products")
		productRouter.Get("/{productID:[0-9+]}", ctrl.Show)
		//...
	}
}
```