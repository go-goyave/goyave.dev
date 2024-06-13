---
title: "Transactions"
description: "A transaction is a sequence of one or multiple operations executed as a single unit of work. This allows rollbacks when something fails during the transaction, effectively cancelling all modifications. If all operations complete successfully, the transaction is committed and changes are applied."
---

# Transactions

[[toc]]

## Introduction

A **transaction** is a sequence of one or multiple operations executed as a single unit of work. This allows **rollbacks** when something fails during the transaction, effectively cancelling all modifications. If all operations complete successfully, the transaction is **committed** and changes are applied.

Usually, transactions are controlled at the database level, and strongly depends on how your database engine works. Managing transactions while separating the business logic from the data layer is a real challenge, and often results in convoluted repositories.

To solve this issue, the services can take advantage of the [**session**](https://pkg.go.dev/goyave.dev/goyave/v5/util/session) mechanism. This system is creating an abstraction of a transaction system (be it a database or not) so the services can define and control business transactions without directly interacting with the database.

For this system to work fluently, it is important that all repository methods only execute **one single** operation.

## Sessions

`session.Session`, in the `goyave.dev/goyave/v5/util/session` package is an interface that can be easily passed to **services** as a **dependency**.

- A **root session** is defined at the server initialization before registering services.
- The service depend on the root session.
- When a service needs to execute a transaction, it uses the root transaction and the `context.Context` to create a **transaction**. The underlying database instance associated with the transaction is injected into the `context.Context` as a value. This child context is passed to a callback function in which the transaction operations will happen. Multiple different repositories, or even different services, can be called inside the transaction seemlessly.  
- The repository uses `session.DB()` to retrieve the actual database instance from the context. If there is no database instance in the context, the repository will use its root database dependency instead as a fallback. Because of this, repositories don't know, and don't need to know, if they are operating in a transaction or not.
- The session mechanism will automatically **rollback** if the callback returns an error. If not, it will automatically **commit**.

:::center
![Session diagram](/diagrams/session.webp){data-zoomable}
:::

### Example

Let's take an example in which we have a system that tracks user actions (user history) and we want a "register" history entry to be created when the user creates their account.

```go
// main.go

import (
	"database/sql"

	"my-project/database/repository"
	"my-project/service/user"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/util/session"
)

func registerServices(server *goyave.Server) {
	server.Logger.Info("Registering services")

	session := session.GORM(server.DB(), &sql.TxOptions{})
	userRepository := repository.NewUser(server.DB())
	userService := user.NewService(session, userRepository)
	server.RegisterService(userService)
}
```
:::info
Here, we use a `Session` implementation abstracting Gorm. The repositories will retrieve the Gorm instance using `session.DB()`.
:::

```go
// service/user/user.go

type UserRepository interface {
	Create(ctx context.Context, user *model.User) (*model.User, error)
}

type HistoryRepository interface {
	Create(ctx context.Context, history *model.History) (*model.History, error)
}

func NewService(session session.Session, userRepository UserRepository, historyRepository HistoryRepository) *Service {
	return &Service{
		session:    session,
		userRepository: userRepository,
		historyRepository: userRepository,
	}
}

func (s *Service) Register(ctx context.Context, user *dto.RegisterUser) (*dto.User, error) {
	u := typeutil.Copy(&model.User{}, user)

	err := s.session.Transaction(ctx, func(ctx context.Context) error {
		var err error
		u, err = s.userRepository.Create(ctx, u)
		if err != nil {
			return errors.New(err)
		}

		history := &model.History{
			UserID: u.ID,
			Action: "register",
		}
		_, err = s.historyRepository.Create(ctx, history)
		return errors.New(err)
	})

	return typeutil.MustConvert[*dto.User](u), err
}
```
```go
// database/repository/user.go
func (r *User) Create(ctx context.Context, user *model.User) (*model.User, error) {
	db := session.DB(ctx, r.DB).Omit(clause.Associations).Create(&user)
	return user, errors.New(db.Error)
}
```
```go
// database/repository/history.go
func (r *History) Create(ctx context.Context, history *model.History) (*model.History, error) {
	db := session.DB(ctx, r.DB).Omit(clause.Associations).Create(&history)
	return history, errors.New(db.Error)
}
```

:::tip
Services that don't need transactions don't need to depend on a session since they will only call one single repository operation.
:::

## Manual transactions

The `Session` interface allows you to manually control the transaction instead of using a callback, thanks to the methods `Begin()`, `Rollback()` and `Commit()`. **You will be responsible of calling `Commit()` or `Rollback()` yourself!**

When you call `Begin()`, a **child session** will be created. It will contain the child `context.Context`. You must use this context for all the operations that are executed inside the transaction. 

The following example is an implementation of the same logic as the previous example but with manual control of the transaction:
```go
// service/user/user.go
func (s *Service) Register(ctx context.Context, user *dto.RegisterUser) (*dto.User, error) {
	u := typeutil.Copy(&model.User{}, user)

	tx, err := s.session.Begin(ctx)
	if err != nil {
		return nil, errors.New(err)
	}

	u, err = s.repository.Create(tx.Context(), u)
	if err != nil {
		_ = tx.Rollback()
		return nil, errors.New(err)
	}

	history := &model.History{
		UserID: u.ID,
		Action: "register",
	}
	_, err = s.repository.Create(tx.Context(), history)
	if err != nil {
		_ = tx.Rollback()
		return nil, errors.New(err)
	}

	err = tx.Commit()
	return typeutil.MustConvert[*dto.User](u), errors.New(err)
}
```

## Nested transactions

The system gracefully handles nested transactions. If a service starts a transaction (either with `Transaction()` or manually with `Begin()`) using a context that already contains a transaction, the session will retrieve this database instance automatically and use it as a starting point for the creation of a nested transaction.

Nested transactions work with savepoints. If the nested transaction returns an error, it will be rolled back to its starting point, leaving the root transaction intact. It is still recommended to rollback the root transaction by simply bringing the returned error up the stack as usual.

The use of savepoints in nested transactions can be disabled by setting Gorm's `DisableNestedTransaction` setting to `true`.

This way, services don't have to worry about operating in a potential transaction from inside another dependent service. Everything will just work as units that can be used anywhere.