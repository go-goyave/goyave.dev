---
title: "Validation"
description: "Goyave provides a powerful, yet easy way to validate all incoming data, no matter its type or its format, thanks to a large number of validators."
---

# Validation

[[toc]]

## Introduction

Goyave provides a powerful, yet easy way to validate all incoming data, no matter its type or its format, thanks to a large number of validators. The validation process ensures the user-provided data matches the server's expectations, and makes it safe to convert the raw dynamic and untyped data to a DTO. In short, the validation system provides type-safety and help ensuring business constraints.

Validators can **alter the raw data** and convert them to the expected type. That means that when you validate a field to be a number, if the validation passes, you are ensured that the data you'll be using in your controller handler is a `float64`. If you're validating an IP, you get a `net.IP` object. If you are validating an `int8`, the request will be denied if the provided number is not an integer or if it is too large to fit in an `int8`.

Incoming requests are validated using **rule sets**, which associate validators with each expected field in the request.

Validation is automatic. You just have to define a rule set and assign it to a route. When the validation doesn't pass, the request is stopped and the validation errors messages are sent as a response, using the correct language. The HTTP response code of failed validation is `422 Unprocessable Entity`.

:::tip IMPORTANT
Don't forget to add the request parsing middleware. Otherwise there would be no data to validate.

```go
import "goyave.dev/goyave/v5/middleware/parse"

router.GlobalMiddleware(&parse.Middleware{})
```
:::

The validation error messages generated and returned to the client are rich and structured for maximum granularity. Here is an example:
```json
{
  "error": {
    "body": {
      "fields": {
        "user": {
          "fields": {
            "name": {
              "errors": ["The name may not have more than 255 characters."]
            },
            "roles": {
              "errors": ["The roles may not have more than 2 items."],
              "elements": {
                "2": {
                  "errors": ["The roles elements must have one of the following values: viewer, admin, moderator."]
                }
              }
            }
          },
          "errors": ["The user must be an object"]
        }
      }
    },
    "query": {
      "fields": {
        "group": {
          "errors": ["The group ID is required."]
        }
      }
    }
  }
}
```

## Rule sets

Functions generating rule sets are defined in a file called `validation.go`, in the same package as the controller that implements the associated handlers. They use the same name as the controller handler they will be used with, appended with the prefix `Request`. For example, a rule set for the `Create` handler will be named `CreateRequest`. If a rule set function can be used for multiple handlers, consider using a name suited for all of them.

When defining rule sets, it is advised to add a short alias (such as `v`) to the validation package import to shorten the syntax:
```go
import (
	"goyave.dev/goyave/v5"
	v "goyave.dev/goyave/v5/validation"
)
```

A rule set function receives a request as parameter. It can use the information of the request to dynamically change the rule set generated.

```go
// http/controller/product/validation.go
package product

import (
	"goyave.dev/goyave/v5"
	v "goyave.dev/goyave/v5/validation"
)

func IndexRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Object()}},
		{Path: "page", Rules: v.List{v.Int(), v.Min(1)}},
		{Path: "perPage", Rules: v.List{v.Int(), v.Between(1, 100)}},
	}
}
```

As you can see, a rule set associates a list of fields, identified by a path, with a list of **validators**. A **validator** implements the interface `validation.Validator`.

:::tip
You can find the complete list of existing validators on the [go.pkg.dev reference](https://pkg.go.dev/goyave.dev/goyave/v5/validation#pkg-types).
:::

You can add a **receiver to your controller** on your rule set functions if you want. This will allow you to access services your controller depends on from these functions. This is especially useful when you work with validators that use a database scope, that should ideally be defined in a repository.

```go
// http/controller/product/validation.go
func (ctrl *Controller) CreateRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Object()}},
		{Path: "name", Rules: v.List{
			v.Required(),
			v.String(),
			v.Unique(ctrl.UserService.UniqueScope("name")),
		}},
		//...
	}
}
```
```go
// service/product/product.go
func (s *Service) UniqueScope(column string) func(db *gorm.DB, val any) *gorm.DB {
	return s.repository.UniqueScope(column)
}
```
```go
// database/repository/product.go
func (r *Product) UniqueScope(column string) func(db *gorm.DB, val any) *gorm.DB {
	return func(db *gorm.DB, val any) *gorm.DB {
		return db.Table(model.Product{}.TableName()).Where(column, val)
	}
}
```

:::danger
Rule sets and their validators are meant for **single-use only**. They should never be re-used or used concurrently.
:::

---

Finally, you can apply your rule set functions to your routes. The rule set function will be called for each new incoming request on these routes, generating a new rule set.

```go
func (ctrl *Controller) RegisterRoutes(router *goyave.Router) {
	subrouter := router.Subrouter("/products")

	subrouter.Get("/", ctrl.Index).ValidateQuery(IndexRequest)
	subrouter.Post("/", ctrl.Create).ValidateBody(CreateRequest)
	// or if using a receiver:
	// subrouter.Get("/", ctrl.Index).ValidateQuery(ctrl.IndexRequest)
	// subrouter.Post("/", ctrl.Create).ValidateBody(ctrl.CreateRequest)
}
```

:::info
When validating the **query**, you should always expect the root element to be an object.
:::

## Validation process

First, the `validation.RuleSet` is converted to `validation.Rules`, a format that is easier to use and that structures the array fields in such a way that it makes it possible to validate them recursively. The paths are also parsed using Goyave's [`walk` library](https://pkg.go.dev/goyave.dev/goyave/v5/util/walk).

When validating, each path will be checked one by one in order of definition. The validation process will explore the raw data being validated to find the element that corresponds to the given path. Then, all validators will be executed on this field, also in order of registration.

In our `IndexRequest` example above:
- We will start by checking `v.CurrentElement`, which corresponds to the root element in the data under validation. Then we check that it is an object.
- Then, we explore the object and see if we can find a field named "page". We first check that it is an int, and make sure the value is of type `int` before checking that its value is superior or equal to `1` (`v.Min(1)`).
- The process continues for all the remaining fields in the rule set.

:::info
- If one field doesn't pass validation, the process is not stopped and the other fields will be checked as well.
- The request's `context.Context` is automatically injected in the database instance that will be passed to the validators.
- If the data under validation is not JSON, the fields that are expected to be an array but are not are converted into an array with a single value. This is useful for queries and any url-encoded data. This behavior is controlled by the `ConvertSingleValueArrays` validation option.
- The `validation.Rules` are added to the `request.Extra` with the keys `goyave.ExtraQueryValidationRules` and `goyave.ExtraBodyValidationRules`.
- If the validation doesn't pass, the errors are added to the `request.Extra` with the keys `goyave.ExtraQueryValidationError` and `goyave.ExtraBodyValidationRules`. The response status is set to `422 Unprocessable Entity` and the related [status handler](/advanced/status-handlers.html) formats and writes them to the response. This means that the error response format can be customized simply by replacing the status handler for code `422`.
- `struct` are considered final values and won't be explored as part of the field path.
:::


## Structure validation

:::warning
- The root element of the data under validation can be anything, of any type. Therefore it is always recommended to validate a field with the path `validation.CurrentElement`.
- Most of the time, you want your root element to be **required**. A request with an empty body and a non-required root element will pass validation. Learn more about this in the [required fields section](#required-fields). 
:::

### Objects

You can validate objects using a dot-separated notation. For example, if you want to validate the following request:

```json
{
    "user": {
        "name": "Josh",
        "email": "josh@example.org"
    }
}
```

You would use the following rule set:
```go
func CreateRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "user", Rules: v.List{v.Required(), v.Object()}},
		{Path: "user.name", Rules: v.List{v.Required(), v.String(), v.Between(3, 50)}},
		{Path: "user.email", Rules: v.List{v.Required(), v.Email()}},
	}
}
```

You can use a wildcard `*` to match all properties of an object without knowing their names. The following rule set will ensure all properties of the "object" are objects that have a "id" property.
```go
func WildcardValidation(r *goyave.Request) v.RuleSet {
    return v.RuleSet{
        "object.*": v.List{v.Object()},
        "object.*.id": v.List{v.Required(), v.Int()},
    }
}
```


### Arrays

Validating arrays is just as easy. You can use the `[]` syntax to identify array elements:

```go
func ArrayRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "array", Rules: v.List{v.Required(), v.Array(), v.Between(1, 5)}},
		{Path: "array[]", Rules: v.List{v.Email(), v.Max(255)}},
	}
}
```

In this example, we are validating an array of one to five email addresses, which can't be longer than 255 characters. When array elements are validated, **all of them** must pass the validation.

If all elements of the array have the same type, the array will be converted to the correct type. For example:
```go
// Raw array whose elements are validated as `v.Int()`
[]any{1, 2.0, uint(3)}

// Will first be converted to:
[]any{1, 2, 3}

// Then to
[]int{1, 2, 3}
```

:::warning
There is an exception for the order in which the fields are validated. The array elements are validated **recursively**. Therefore, the array elements are always validated **before** their parent array, no matter if you define them before or after in the rule set.

Validating arrays this way is important so the array type can be converted to the expected type if all elements pass validation.
:::

The root element can be anything, not necessarily an object. This means that you can have an array as the root element:
```go
func ArrayRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Array()}},
		{Path: "[]", Rules: v.List{v.Email(), v.Max(255)}},
	}
}
```

### N-dimensional arrays

You can validate n-dimensional arrays.

```go
func ArrayRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "values", Rules: v.List{v.Required(), v.Array()}},
		{Path: "values[]", Rules: v.List{v.Array(), v.Max(3)}},
		{Path: "values[][]", Rules: v.List{v.Array()}},
		{Path: "values[][][]", Rules: v.List{v.Float64(), v.Max(4)}},
	}
}
```

In this example, we are validating a three-dimensional array of numeric values. The first dimension must be made of arrays with a size of 3 or less. The second dimension must be made of arrays containing numbers. The third dimension must be numbers inferior or equal to 4. The following JSON input passes the validation:
```json
{
    "array": [
        [[0.5, 1.42], [0.6, 4, 3]],
        [[0.6, 1.43], [], [2]]
    ]
}
```

### Arrays of objects

You can validate objects inside arrays using the same dot-separated syntax:

```go
func PeopleRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "people", Rules: v.List{v.Required(), v.Array()}},
		{Path: "people[]", Rules: v.List{v.Object()}},
		{Path: "people[].name", Rules: v.List{v.Required(), v.String(), v.Max(255)}},
		{Path: "people[].email", Rules: v.List{v.Required(), v.Email(), v.Max(255)}},
	}
}
```

In this example, we are validating an array of people. The following JSON input passes the validation:

```json
{
    "people": [
        {
            "name": "John",
            "email": "john@example.org",
        },
        {
            "name": "Zoe",
            "email": "zoe@example.com",
        },
    ]
}
```

## Required, nullable and undefined fields

- If a field is **required** (`validation.Required()` validator), the field **must be present** in the request.
- If a field is **nullable** (`validation.Nullable()` validator), the field can have a `nil` value.
- A **nullable** field can be **required**. This means that a value **must** be provided and **present** in the request.
- `nil` is a value, and is different from a field being **undefined**. A field is **undefined** if the path to the field doesn't match anything in the request data. 
- If a request contains a field with a `nil`/`null` value, and that this field is not **nullable**, the field is removed entirely from the request. This means that a field with a `nil` value is considered **undefined** if the field is not marked as **nullable**.
	- `nil` array elements are **not removed** even if they are not marked as **nullable**.
- If a **required** field is **undefined**, subsequent validators will not be executed.
- If a **required** field has an **undefined** parent, its validation will be **skipped** completely.
	- Make sure that all parents have validators defined for them to make sure they have the expected type.
	- You can **require** fields inside an object without making the object itself **required**. This means that the child fields will be **required** only if the parent is **present**.
- `validation.Required()` on array elements has no effect. Use a size validator on the array to check the number of elements it contains. 

:::warning
A field that is not listed in the rule set is not validated but it can still exists in the body, validate all the fields you expect without exception.
:::

### Conditional requirement

Using `validation.RequiredIf()`, you can make a field **required** dynamically. If and only if the specified callback returns `true`, the field will be set as **required**.

```go
func BookRequest(request *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "author_id", Rules: v.List{v.RequiredIf(func(ctx *v.Context) bool {
			return request.RouteParams["authorName"] == "anonymous"
		}), v.Int()}},
	}
}
```

:::info
No matter the order in which the validators are defined for the field under validation, the `RequiredIf`'s callback **will always be executed first** so the **presence** criteria can be checked as explained above.

The callback is therefore executed **twice**. Once for the **presence** criteria, and once for the actual validation.
:::

## Composition

**Composition** can help you reduce redundancy by re-using the same rule set function multiple times without duplicating them. To **compose** rule sets, use a `validation.RuleSet` as the `Rules` instead of a `validation.List`:

```go
func CreateAuthorRequest(request *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "name", Rules: v.List{v.Required(), v.String()}},
		{Path: "bio", Rules: v.List{v.Required(), v.String()}},
		{Path: "books", Rules: v.List{v.Required(), v.Array()}},
		{Path: "books[]", Rules: CreateBookRequest(request)},
	}
}

func CreateBookRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "title", Rules: v.List{v.Required(), v.String()}},
		{Path: "price", Rules: v.List{v.Required(), v.Float64()}},
	}
}

// Results in:
func CreateAuthorAndBooksRequest(request *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "name", Rules: v.List{v.Required(), v.String()}},
		{Path: "bio", Rules: v.List{v.Required(), v.String()}},
		{Path: "books", Rules: v.List{v.Required(), v.Array()}},
		{Path: "books[]", Rules: v.List{v.Required(), v.Object()}},
		{Path: "books[].title", Rules: v.List{v.Required(), v.String()}},
		{Path: "books[].price", Rules: v.List{v.Required(), v.Float64()}},
	}
}

```

:::tip
- You can **nest** composition as much as you want, provided you don't create infinite recursion.
- You can **compose** on the current element.
:::

### Relativity

The root data is **relative** to the rule set. In our previous example, this means that for the rule set returned by `CreateBookRequest()`, it will look like we are validating a single book and that the root element is the book object. This is useful when rules need to **compare** with other fields, such as `validation.LowerThan("otherField")`.

If we modify our above example like so:
```go{5-6}
func CreateBookRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "title", Rules: v.List{v.Required(), v.String()}},
		{Path: "minPrice", Rules: v.List{v.Required(), v.Float64()}},
		{Path: "price", Rules: v.List{v.Required(), v.Float64(), v.GreaterThanEqual("minPrice")}},
	}
}
```

When using `CreateAuthorRequest()`, the `GreaterThanEqual()` validator will compare the value of `books[].price` with `books[].minPrice`, **taking the array index into account.** 

When using `CreateBookRequest()` directly, the `GreaterThanEqual()` validator will compare the value of `price` with `minPrice`.

:::tip
Composition can therefore also be used for functional reasons and not only code re-usability. 
:::

## Manual validation

You may need to validate data manually, or data that doesn't come from a Goyave request. As long as this data can be explored, you can use the same validation system.

```go
func (ctrl *Controller) Handler(response *goyave.Response, request *goyave.Request) {
	var data any = map[string]any{
		//...
	}
	ruleSet := validation.RuleSet{
		//...
	}
	opt := &validation.Options{
		Data:                     data,
		Rules:                    ruleSet,
		Now:                      request.Now,
		ConvertSingleValueArrays: false,
		Language:                 request.Lang,
		DB:                       ctrl.DB().WithContext(request.Context()),
		Config:                   ctrl.Config(),
		Logger:                   ctrl.Logger(),
		Extra:                    map[any]any{},
	}
	validationErrors, errs := validation.Validate(opt)
	if errs != nil {
		response.Error(errs)
		return
	}

	if validationErrors != nil {
		// There are validation errors
	}

	// The validation may have converted the root element to another type.
	data = opt.Data
	//...
}
```

:::info
The second value returned by `validation.Validate()` is a slice of error that occurred during validation. These errors are not validation errors but error raised when a validator could not be executed correctly. For example if a validator using the database generated a database error.
:::

## Custom validators

If none of the available validation rules satisfy your needs, you can implement custom validation rules. To do so, create a new file `http/validation/<validator_name>.go` in which you are going to define your custom rules. Each validator should have its own file with the same name as the validator's name.

:::tip
When importing your custom rules, the package name may be confusing for the reader, as it would be the same as the framework's package. It is also long. Therefore, it is advised to also add a short alias (such as `vv`) to your import to shorten the syntax:
```go
import vv "my-project/http/validation"
```
:::

All validators must implement the `validation.Validator` interface. To do so, they must compose with `validation.BaseValidator` and at least implement the `Validate()` and `Name()` methods. The other methods are optional and defined by `validation.BaseValidator` with default values.

```go
// http/validation/custom.go
package validation

import "goyave.dev/goyave/v5/validation"

type CustomValidator struct {
	validation.BaseValidator
}

func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	// ...
	return true
}

func (v *CustomValidator) Name() string {
	return "custom"
}

func Custom() *CustomValidator {
	return &CustomValidator{}
}
```

---

If your rule modifies the value of the field under validation, it must re-assign `ctx.Value`. This is useful for converting rules such as date, which converts the input data to `time.Time`. A validator that converts data is most of the time a **type** validator, meaning it should implement `IsType() bool` and return `true`.
```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	//...
	ctx.Value = "new value"
	return true
}

func (v *CustomValidator) IsType() bool {
	return true
}
```

---

If your validator supports many different types of raw data (numbers, strings, arrays, objects and/or files) and should have a different validation error message depending on the type of the value, then your validator should implement `IsTypeDependent() bool` and return `true`. Learn more about this below in the [localization](#localization) section.

```go
func (v *CustomValidator) IsTypeDependent() bool {
	return true
}
```

If there is a **type** validator in the list for this field, it will be used as a reference for the expected type of the field. Otherwise, the actual field type is used instead.

---

If your validator uses the database, or any other operation that can generate an `error`, use `validation.Context.AddError()` and `return false`:

```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	if ctx.Invalid {
		return true
	}

	count := int64(0)
	err := v.DB().Table("table_name").Where("id", ctx.Value).Count(&count).Error
	if err != nil {
		ctx.AddError(errors.New(err))
		return false
	}
	return count > 0
}
```

---

:::info
- If the validation was started from the built-in validation middleware, the request object will be available from the `Extra` with the key `validation.ExtraRequest{}`.
- `validation.Context.Invalid` is a readonly field that can be used to skip the validator if one prior validator in the chain returned `false`.
```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	if ctx.Invalid {
		// Skip without returning a validation error message
		// It is safe because a prior validator already returned false
		return true
	}
	// ...
}
```
- Thanks to the composition with `validation.BaseValidator`, all validators have access to the database, the configuration, the language and the logger that were passed in the `validation.Options`. If the validation was started from the built-in validation middleware, those values will be available automatically.
:::

### Nested validation

Validators can do what's called **nested validation**. This means they generate a rule set and use them to validate a complex field using manual validation. They can then merge the validation errors with the higher level ones.

**Example**:
```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {

	ruleSet := validation.RuleSet{
		//...
	}
	opt := &validation.Options{
		Data:                     ctx.Value,
		Rules:                    ruleSet,
		Now:                      ctx.Now,
		ConvertSingleValueArrays: false,
		Language:                 v.Lang(),
		DB:                       v.DB(),
		Config:                   v.Config(),
		Logger:                   v.Logger(),
	}
	validationErrors, errs := validation.Validate(opt)
	if errs != nil {
		ctx.AddError(errs...)
		return false
	}

	if validationErrors != nil {
		ctx.AddValidationErrors(ctx.Path(), validationErrors)
		return false
	}

	return true
}
```
Here, the `validationErrors` will be merged with the parent validation errors at the path of the field under validation.

For example, if the field is `book.author` and `validationErrors` contains the following:
```json
{
  "fields": {
    "name": {
      "errors": ["The name must be a string."]
    }
  },
  "errors": ["The author contains invalid information."]
}
```

Then the parent validation errors will look like this after the merge:
```json{6-11}
{
  "fields": {
    "book": {
      "fields": {
        "author": {
          "fields": {
            "name": {
              "errors": ["The name must be a string."]
            }
          },
          "errors": ["The author contains invalid information."]
        }
      }
    }
  }
}
```

Missing path segments will be added automatically if missing. Fields that already exist in the resulting validation errors are not overridden, the new values are merged into them.

You can also add a single error by message with `validation.Context.AddValidationError()`:
```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	//...
	ctx.AddValidationError(ctx.Path(), v.Lang().Get("customErrorMessage"))
	return false
}
```

:::tip
The path can be manipulated and changed using the [`walk.Path` API](https://pkg.go.dev/goyave.dev/goyave/v5/util/walk).
:::

#### Array elements batch validation

If your validator is meant to validate an array, and that is is more efficient to do so at the array level rather than the element level, you can also add errors on specific array element indexes.

This is useful when an array needs to be validated against the database for example. It is more efficient to execute a single SQL query rather than one per element.

```go
func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	//...
	ctx.AddArrayElementValidationErrors(1, 4, 6)
	return false
}
```
:::info
In this example, the elements at indexes 1, 4 and 6 of the array field under validation will be marked as invalid and the validator's associated error message will be added to the resulting validation errors.
:::

## Localization

The strings returned as validation error messages when a validator returns `false` are defined in `resources/lang/<language_name>/rules.json`. The entry name is the name of the rule (the value returned by the rule's `Name()` method).

```json
{
	"custom_format": "The :field format is invalid."
}
```

When the field concerned is an array element, the entry used will be: `validator_name.element`.

```json
{
	"custom_format.element": "The :field element format is invalid."
}
```

For **type-dependent** validators, the type of the value is also defined and allows you to return different messages depending on the type of the field:
```json
{
  "size.string": "The :field must be exactly :value characters-long.",
  "size.numeric": "The :field must be exactly :value.",
  "size.array": "The :field must contain exactly :value items.",
  "size.file": "The :field must be exactly :value KiB.",
  "size.object": "The :field must have exactly :value fields.",
  "size.string.element": "The :field elements must be exactly :value characters-long.",
  "size.numeric.element": "The :field elements must be exactly :value.",
  "size.array.element": "The :field elements must contain exactly :value items.",
  "size.object.element": "The :field elements must have exactly :value fields."
}
```

### Placeholders

Validation messages can use [placeholders](/advanced/localization.html#placeholders) to inject dynamic values in the validation error messages. Each validator defines its own placeholders thanks to the `MessagePlaceholders()` method:

```go
// MessagePlaceholders returns the ":min" and ":max" placeholder.
func (v *BetweenValidator) MessagePlaceholders(_ *Context) []string {
	return []string{
		":min", fmt.Sprintf("%v", v.Min),
		":max", fmt.Sprintf("%v", v.Max),
	}
}
```

With these placeholders, the message `The :field must be between :min and :max characters.` will be changed to `The name must be between 1 and 255 characters.`.

The `:field` placeholder is replaced by the translated field name by default. The field name translations are defined in `resources/lang/<language_name>/fields.json`. So if you have a field `authorId`, you can make it so it will appear as `author ID` in the message like so:
```json
{
	"authorId": "author ID"
}
```

If no field name translation is available, this raw field name is used without the path prefix. For example, if the path to the field is `book.author.name`, the field name will only be `name`. For arrays elements, the name used is the name of the array.