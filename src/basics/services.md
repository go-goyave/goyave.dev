---
title: "Services"
description: "Services represent the Domain/Business layer. This is where the core logic and value of your application resides."
---

# Services

[[toc]]

## Introduction

**Services** represent the **Domain/Business layer**. This is where the core logic and value of your application resides. A service is structure implementing either business logic (e.g. `UserService` manages the `User` resource) or an abstraction to a feature (e.g.: `AuthService` manages authentication) or external dependency (e.g.: other microservice, third-party API).

This layer is making a bridge between the two other layers (Presentation and Data). It takes DTOs as input and returns DTOs as output. When it needs to communicate with the data layer, it uses models.

## Implementation

A **service** must implement the `goyave.Service` interface: that is have a `Name()` method that returns a constant used to identify the service and retrieve it.

The service names are defined in `service/service.go`. This file will look something like this:
```go
package service

// Name of the implemented services.
const (
	User    = "user"
	Product = "product"
	Auth    = "auth"
	//...
)
```

:::info
Defining the service names in constants in a dedicated package helps not creating strong dependencies between packages.
:::

Once done, you can implement your service. Each service should have its own package in `service`, named after the resource it is using, in singular form.

Its dependencies should be defined with interfaces and accepted as constructor parameters. A service can depend on a repository but also on other services, also defined by an interface.

**Full example:**
```go
// service/user/user.go
package user

import (
	"context"

	"goyave.dev/goyave/v5/database"
	"goyave.dev/goyave/v5/util/errors"
	"goyave.dev/goyave/v5/util/typeutil"
	"my-project/database/model"
	"my-project/dto"
	"my-project/service"
)

// Repository defines the DB functions this service relies on when manipulating users.
type Repository interface {
	First(ctx context.Context, id int64) (*model.User, error)
	Paginate(ctx context.Context, page int, pageSize int) (*database.Paginator[*model.User], error)
}

// Service for the user resource.
type Service struct {
	repository Repository
}

// NewService create a new user Service.
func NewService(repository Repository) *Service {
	return &Service{
		repository: repository,
	}
}

// First returns the first user identified by the given ID.
func (s *Service) First(ctx context.Context, id int64) (*dto.User, error) {
	u, err := s.repository.First(ctx, id)
	return typeutil.MustConvert[*dto.User](u), errors.New(err)
}

// Paginate returns a paginator containing all the records that match the given filter request.
func (s *Service) Paginate(ctx context.Context, page, pageSize int) (*database.PaginatorDTO[*dto.User], error) {
	paginator, err := s.repository.Paginate(ctx, page, pageSize)
	return typeutil.MustConvert[*database.PaginatorDTO[*dto.User]](paginator), errors.New(err)
}

// Name returns the service name.
func (s *Service) Name() string {
	return service.User
}
```

## Service container

Goyave provides a simple **dependency container for services** that components can access from the server at any time (ideally from their `Init()` method). In the initialization phase of the lifecycle, the services are created and registered in this container.

Any service can be **registered** at the initialization lifecycle step:
```go
func registerServices(server *goyave.Server) {
	server.Logger.Info("Registering services")

	userRepository := repository.NewUser(server.DB())
	userService := user.NewService(userRepository)
	server.RegisterService(userService)
}
```

Dependents on this service can then retrieve it using the `Service()` accessor and type-asserting the result:
```go
server.Service(service.User).(MyServiceInterface)
```

The `LookupService()` accessor provides a safer way to retrieve a service that may not be registered:
```go
userService, ok := server.LookupService(service.User)
```