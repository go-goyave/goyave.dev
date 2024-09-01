---
title: "DTO and model mapping"
description: "Goyave provides tools and guidelines to streamline the entire DTO conversion and model mapping process and make it painless."
---

# DTO and model mapping

[[toc]]

## Introduction

Raw data sent by the clients is inconvenient to use, may contain extra unexpected information (that was not validated) and may be formatted slightly differently from how we would like to use it in our **domain**.

**Models** strictly belong to the **data layer** because they may contain sensitive data that should not be exposed and because their structure is a mirror of the database schema, which may be slightly different from the business needs. Therefore, their use is also very inconvenient and dangerous outside of the data layer. Models should never leak in the presentation layer in any way.

To make data transfer between the client and the internal layers of the application clean, robust and safe, yet still flexible, **DTOs** (Data Transfer Object) are defined. They will be used inside the **presentation and business layers**.

Using such structures is inconvenient in a typical project though, as it hard, verbose and very cumbersome to convert data structures of different types several times and pass them around in the application. Unmarshalling raw user input into a structure directly is not a good solution neither, as it wouldn't allow the incredible type flexibility and granularity provided by the [validation system](/basics/validation.html). When designing the framework, a choice has been made: start to work with raw untyped data, validate and sanitize it first before converting it to a struct so the very dynamic nature of the web is preserved and works harmoniously with the strict typing of Go.

Goyave provides tools and guidelines to streamline the entire **DTO conversion** and **model mapping** process and make it painless.

## DTO definition

DTO are structures defined in the `dto` package. Each resource has its own file. For example a "user" resource would have a `dto/user.go` file.

```go
// dto/user.go
package dto

import (
	"time"

	"gopkg.in/guregu/null.v4"
)

type User struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt null.Time `json:"updatedAt"`
	DeletedAt null.Time `json:"deletedAt"`
}
```

:::tip
Is is **recommended** to specify a json name to all fields in every DTO.
:::

All operations on a resource requiring a request body and/or query or returning a non-empty body should have a dedicated DTO. For example, a "product" resource would have:
- a `Product` structure, representing how a single product would be presented to the client
- a `CreateProduct` structure, representing the request body for a product creation
- a `UpdateProduct` structure, representing the request body for a product modification
- more structures may be defined for specific business-related routes

### Handling optional fields

It is frequent to have optional fields in a request, most commonly for queries or update requests. **Optional** fields can be **undefined**, which is different from `nil` or a zero-value. This distinction is important in cases where a **nullable** field is **optional**.

The framework provides a handy generic type that will make this case a breeze: `typeutil.Undefined[T]`. **All optional fields** should use this type in DTOs. However, this type is **not suited** for use inside models.

`typeutil.Undefined[T]` wraps a generic value used to differentiate between the absence of a field and its zero value, without using pointers This is especially useful when using wrappers such as `sql.NullString`, which are structures that encode/decode to a non-struct value. When working with requests that may or may not contain a field that is a nullable value, you cannot use pointers to define the presence or absence of this kind of structure. Thus the case where the field is absent (zero-value) and where the field is present but has a `null` value are indistinguishable.

This type only implements:
- `encoding.TextUnmarshaler`
- `json.Unmarshaler`
- `driver.Valuer`

Because it only implements "read"-related interfaces, it is not recommended to use it for response DTOs or for scanning database results.

```go
import "goyave.dev/goyave/v5/util/typeutil"

type UpdateProduct struct {
	Name  typeutil.Undefined[string]  `json:"name,omitempty"`
	Price typeutil.Undefined[float64] `json:"price"`
	Tag   typeutil.Undefined[*string] `json:"tag"`
}
```
```go
var dto UpdateProduct
dto.Name.Val // The actual field value
dto.Name.IsPresent() // true/false
dto.Name.Default("default name") // returns "default name" is field is not present
```

:::info
- In the above example, `dto.Tag` can be **present** and have a `nil` value. If it's present, then we will update the `tag` column to `NULL` in the database.
- Custom types are supported, including implementations of `driver.Valuer`, `sql.Scanner` and `copier.Valuer`.
- When a field is **undefined** (absent), the `typeutil.Structure` will have its zero-value. It will therefore be ignored by the json `omitempty` tag and by the model mapping.
:::


## DTO conversion

Every controller handler receiving data from the client (query and/or body) should convert it to a **DTO** before using it. The conversion should be safe and successful, provided you correctly defined your [validation rules](/basics/validation.html).

```go
// http/controller/user.go
import (
	//...
	"goyave.dev/goyave/v5/util/typeutil"
)

func (ctrl *Controller) Index(response *goyave.Response, request *goyave.Request) {
	query := typeutil.MustConvert[dto.Index](request.Query)
	//...
}

func (ctrl *Controller) Create(response *goyave.Response, request *goyave.Request) {
	createDTO := typeutil.MustConvert[dto.CreateProduct](request.Data)
	//...
}
```

:::info
Converting the raw input data this way automatically filters out unexpected extra data sent by the user since the DTO structure won't have any field to receive it.
:::

In the same fashion, all data coming out of the **domain layer** should be converted to a DTO. Converting models into a DTO automatically filters out sensitive data, as these fields are not present in the DTO structure. This way, you have easier control over what information you return to the client.

```go
func (ctrl *Controller) Show(response *goyave.Response, request *goyave.Request) {
	userID, err := strconv.ParseUint(request.RouteParams["userID"], 10, 64)
	if err != nil {
		response.Status(http.StatusNotFound)
		return
	}

	user, err := ctrl.UserService.First(request.Context(), uint(userID))
	if response.WriteDBError(err) {
		return
	}

	response.JSON(http.StatusOK, user)
}
```
```go
// service/user/user.go
func (s *Service) First(ctx context.Context, id uint) (*dto.User, error) {
	u, err := s.repository.First(ctx, id)
	return typeutil.MustConvert[*dto.User](u), errors.New(err)
}
```

:::info
DTO conversion works by JSON marshaling the input structure before unmarshaling the result into the target structure. This method is more efficient, reliable and flexible than relying on reflection. Moreover, it unifies the struct tags under the `json` tag, rather than needing multiple tags doing different things.
:::


## Model mapping

It is important to **never interact with the database using DTOs**, it is the role of the **models**. It may be tempting to specify a table name and pass the DTO directly to Gorm for it to create or update records. However, this is a **very bad practice**. Here is a non-exhaustive list explaining why:
- Gorm may fail to correctly map the DTO fields with the database columns.
- Gorm may fail to determine the correct data type of the fields.
- Temporal inconsistencies may happen for updates.
- Timestamp columns such as `update_at` won't be automatically updated.
- Scopes such as soft-deletion won't work.

**Model mapping** is the process of copying a DTO's fields into a model, effectively overriding a part of the model's fields with the values coming from the DTO. This mapping is as easy as calling `typeutil.Copy(model, dto)`. This function is using the [`copier` library](https://github.com/go-goyave/copier).

For creation, an empty model can be used as a target.

```go
// service/user/user.go
import (
	//...
	"goyave.dev/goyave/v5/util/typeutil"
)

func (s *Service) Register(ctx context.Context, user *dto.RegisterUser) (*dto.User, error) {
	u := typeutil.Copy(&model.User{}, user)

	u, err := s.repository.Create(ctx, u)
	return typeutil.MustConvert[*dto.User](u), errors.New(err)
}
```
```go
// database/repository/user.go
func (r *User) Create(ctx context.Context, user *model.User) (*model.User, error) {
	db := session.DB(ctx, r.DB).Omit(clause.Associations).Create(user)
	return user, errors.New(db.Error)
}
```

For updates, fetch **the entire model** first, then use model mapping and finally `Save`.

Doing this eliminates the risk of **temporal inconsistencies**, which is the risk of two concurrent requests updating the same resource, but the data of the two requests are incompatible from a business point of view.

```go
// service/user/user.go
func (s *Service) Update(ctx context.Context, userID uint, u *dto.UpdateUser) (*dto.User, error) {
	var user *model.User
	err := s.session.Transaction(ctx, func(ctx context.Context) error {
		var err error
		user, err = s.repository.First(ctx, userID)
		if err != nil {
			return errors.New(err)
		}

		user = typeutil.Copy(user, u)
		user, err = s.repository.Update(ctx, user)
		if err != nil {
			return errors.New(err)
		}
		return nil
	})

	return typeutil.MustConvert[*dto.User](user), err
}
```
```go
// database/repository/user.go
func (r *User) Update(ctx context.Context, user *model.User) (*model.User, error) {
	db := session.DB(ctx, r.DB).Omit(clause.Associations).Save(user)
	return user, errors.New(db.Error)
}
```

:::info
Learn more about the `session` mechanism [here](/advanced/transactions.html).
:::