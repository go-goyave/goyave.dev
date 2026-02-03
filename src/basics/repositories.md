---
title: "Repositories"
description: "Repositories are part of the Data layer. They implement the methods that will be called to work with the data (fetch, create, update, delete, etc)"
---

# Repositories

[[toc]]

## Introduction

**Repositories** are part of the  **Data layer**. They implement the methods that will be called to work with the data (fetch, create, update, delete, etc) and will use **models**. **Models** are a Go representation of your database schema. An instance of a model is a single database record.

A repository should **not** have any dependency to a service, but can depend on other repositories. Therefore, it must interact only with the database: its purpose is to execute the necessary **unitary** database operation for data manipulation. Therefore, each repository method executes **only one database operation**. **No business logic** should be implemented in the repositories.

For example, if we have a system that tracks user actions (user history) and we want a "register" history entry to be created when the user creates their account, we would have two repositories that don't depend on each other:
- the `user.Create` method should **only** create the user, not the associated history entry.
- the `history.Create` method should **only** create the history entry.

It is the **services** job to handle these kind of scenarios, using a [transaction](/advanced/transactions.html).

## Models

Models are defined in the `database/model` package. Each resource has its own file. Models are usually just normal Golang structs, basic Go types, or pointers of them. `sql.Scanner` and `driver.Valuer` interfaces are also supported.

**Example:**
```go
// database/model/user.go
package model

import (
	"time"

	"gopkg.in/guregu/null.v4"
	"gorm.io/gorm"
)

type User struct {
	ID        int64 `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt null.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	Email     string         `gorm:"uniqueIndex"`
}

func (User) TableName() string {
	return "users"
}
```
:::info
It is recommended to always define a `TableName()` method.
:::

:::tip
Learn more about model definition on [Gorm's documentation](https://gorm.io/docs/models.html).
:::

## Implementation

Each repository should have its own file in `database/repository`, named after the resource it is using, in singular form.

**Full example:**
```go
// database/repository/user.go
package repository

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"goyave.dev/goyave/v5/database"
	"goyave.dev/goyave/v5/util/errors"
	"goyave.dev/template/database/model"
)

// User repository for user manipulation in the database.
type User struct {
	DB *gorm.DB
}

// NewUser create a new user repository.
func NewUser(db *gorm.DB) *User {
	return &User{
		DB: db,
	}
}

// Paginate returns a paginator after executing it.
func (r *User) Paginate(ctx context.Context, page int, pageSize int) (*database.Paginator[*model.User], error) {
	users := []*model.User{}

	paginator := database.NewPaginator(r.DB, page, pageSize, &users)
	err := paginator.Find()
	return paginator, err
}

// GetByID returns the user identified by the given ID, or `nil`.
// If not found, returns `gorm.ErrRecordNotFound`.
func (r *User) GetByID(ctx context.Context, id int64) (*model.User, error) {
	var user *model.User
	db := r.DB.Where("id", id).First(&user)
	return user, errors.New(db.Error)
}

func (r *User) Create(ctx context.Context, user *model.User) (*model.User, error) {
	db := r.DB.Omit(clause.Associations).Create(&user)
	return user, errors.New(db.Error)
}
```

## Naming conventions

- Use `Get`, `GetByID`, `GetBy...` for operations returning a single record. If the record is not found, these methods should return an error, usually `gorm.ErrRecordNotFound`.
- Use `Find`, `FindByID`, `FindBy...` for operations returning zero or multiple records. If no record is found, these methods should return an empty slice and no error.
	- You can use `Paginate` or `Index` for methods returning *all* records or records from a generic search, for example using the [filter library](/libraries/filter.html).
- For write methods, use descriptive actions such as `Create`, `Update`, `Delete`.
- Any other method is generally for specific use-cases. These methods' name should evoke the use-case. For example:
```go
func (r *User) FindInactive(ctx context.Context, inactivityPeriod time.Duration) ([]*model.User, error)
```