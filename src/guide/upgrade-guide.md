---
meta:
  - name: "og:title"
    content: "Upgrade guide - Goyave"
  - name: "twitter:title"
    content: "Upgrade guide - Goyave"
  - name: "title"
    content: "Upgrade guide - Goyave"
---

# Upgrade Guide

Although Goyave is developed with backwards compatibility, breaking changes can happen, especially in the project's early days. This guide will help you to upgrade your applications using older versions of the framework. Bear in mind that if you are several versions behind, you will have to follow the instructions for each in-between versions.

[[toc]]

## v3.7.0+ to v4.0.0

First, replace `goyave.dev/goyave/v3` with `goyave.dev/goyave/v4`. **Go <1.16 is not supported anymore**, the requirements have been bumped to **Go 1.16+** and only the last two major verions of Go will be supported, starting with v4.0.0.

### Validation changes

#### Requests

The syntax for rules definition has changed.

```go
var (
	StoreRequest = validation.RuleSet{
		"text":         {"required", "string", "between:3,50"},
		"object.field": {"required", "string"},
		"values":       {"required", "array", ">array", ">>array:numeric", ">max:3", ">>>max:4"},
	}
)
```
Becomes
```go
var (
	StoreRequest = validation.RuleSet{
		"text":         validation.List{"required", "string", "between:3,50"},
		"object.field": validation.List{"required", "string"},
		"values":       validation.List{"required", "array"},
		"values[]":     validation.List{"array", "max:3"},
		"values[][]":   validation.List{"array:numeric"},
		"values[][][]": validation.List{"numeric", "max:4"},
	}
)
```

::: tip
You can use an alias on the validation import to shorten the syntax:
```go
import v "goyave.dev/goyave/v3/validation"

var (
	EchoRequest = v.RuleSet{
		"text": v.List{"required", "string", "between:3,50"},
	}
)
```
:::

When using the verbose syntax (`*validation.Rules`), there is no `ArrayDimension` field anymore.
```go
rules := &validation.Rules{
	Fields: validation.FieldMap{
		"info": {
			Rules: []*validation.Rule{
				{Name: "nullable"},
				{Name: "array", Params: []string{"string"}},
				{Name: "min", Params: []string{"2"}, ArrayDimension: 1},
			},
		},
	},
}
```
Becomes
```go
rules := &validation.Rules{
	Fields: validation.FieldMap{
		"info": &validation.Field{
			Rules: []*validation.Rule{
				{Name: "nullable"},
				{Name: "array", Params: []string{"string"}},
			},
		},
		"info[]": &validation.Field{
			Rules: []*validation.Rule{
				{Name: "min", Params: []string{"2"}},
			},
		},
	},
}
```

Because `required` now allows empty string, you will have to add another rule to your validated strings (if not already the case):

```go
var (
	StoreRequest = validation.RuleSet{
		"text":         validation.List{"required", "string"},
	}
)
```
Becomes
```go
var (
	StoreRequest = validation.RuleSet{
		"text":         validation.List{"required", "string", "min:1"}, // min:1 added
	}
)
```

#### Custom rules

The signature of `validation.RuleFunc` has changed to `func(*validation.Context) bool`.

```go
func validatePassword(field string, value interface{}, parameters []string, form map[string]interface{}) bool {
	// ...
}
```
Becomes:
```go
func validatePassword(ctx *Context) bool {
	// field      is now ctx.Name
	// value      is now ctx.Value
	// parameters is now ctx.Rule.Params
	// form       is now ctx.Data
	// ...
}
```

Converting rules previously updated input data like this:
```go
fieldName, _, parent, _ := GetFieldFromName(field, form)
parent[fieldName] = newValue
```
Now they must update the context value:
```go
ctx.Value = newValue
```

#### Placeholders

The signature of `validation.Placeholder` has changed to `func(fieldName string, language string, ctx *validation.Context) string`.

```go
func myPlaceholder(field string, rule string, parameters []string, language string) string {
	return parameters[0]
}
```
Becomes:
```go
func myPlaceholder(field string, language string, ctx *Context) string {
	// the old "rule" paramater becomes "ctx.Rule.Name"
	return ctx.Rule.Params[0]
}
```

#### Errors

Instead of a flat `map[string][]string`, `validation.Errors` (what is returned by `validation.Validate()`) is now a recursive structure defined as follows:
```go
type Errors map[string]*FieldErrors

type ArrayErrors map[int]*FieldErrors

type FieldErrors struct {
	Fields   Errors      `json:"fields,omitempty"`
	Elements ArrayErrors `json:"elements,omitempty"`
	Errors   []string    `json:"errors,omitempty"`
}
```

### Helper package refactoring

The `helper` package has been refactored and split into several focused packages. To upgrade, replace your `helper` imports with the corresponding package:
- `helper/filesystem` moved to `util/fsutil`
- `helper/walk` moved to `util/walk`
- New package `util/httputil`
  - Contains `ParseMultiValuesHeader()` and `HeaderValue`
- New package `util/reflectutil`
  - Contains `Only()`
- New package `util/sliceutil`
  - Contains `IndexOf()`, `IndexOfStr()`, `Contains()`, `ContainsStr()` and `Equal()` (previously named `SliceEqual()`)
- New pacakge `util/sqlutil`
  - Contains `EscapeLike()`
- New package `util/typeutil`
  - Contains `Map`, `ToFloat64()`, `ToString()`

### Minor changes

- Because of the migration from `dgrijalva/jwt-go` library to the maintained [golang-jwt/jwt](https://github.com/golang-jwt/jwt), you will need to update the import paths to `github.com/golang-jwt/jwt`.
- JWT: now uses standard `sub` instead of `userid` by default. If you are using custom tokens or if your infrastructures relies on tokens generated with `userid` as a claim, either update everything that depends on `userid` or modify you token generation with [`auth.GenerateTokenWithClaims()`](./advanced/authentication.html#auth-generatetokenwithclaims) and [`ClaimName`](./advanced/authentication.html#custom-id-claim-name).
- `database.Paginator` field names are now in camel case when json marshalled. Applications that depend on this and that are case-sensitive must be updated.
- The `DisallowNonValidatedFields` middleware doesn't exist anymore. If you still want to use it, implement a custom middleware.
- The unused `name` parameter in `request.Cookie()` has been removed. Simply remove parameters from your calls to this method. As this parameter was not in use, this will not change the behavior of your application.
- Removed the `confirmed` validation rule. Use `same:path.to.field` instead.
- If you were using the logging or rate limiting middleware, you are advised to register them using `router.GlobalMiddleware()` instead of `router.Middleware()`.

## v3.6.0 to v3.7.0+

The framework was moved to the [go-goyave](https://github.com/go-goyave/) organization and its import path has changed. To upgrade, you just have to replace `github.com/System-Glitch/goyave/v3` with `goyave.dev/goyave/v3`.

## v2.x.x to v3.0.0

First, replace `github.com/System-Glitch/goyave/v2` with `goyave.dev/goyave/v3`.

### Routing changes

Routing has been improved by changing how validation and route-specific middleware are registered. The signature of the router functions have been simplified by removing the validation and middleware parameters from `Route()`, `Get()`, `Post()`, etc. This is now done through two new chainable methods on the `Route`:

```go
router.Post("/echo", hello.Echo, hellorequest.Echo)

// Becomes
router.Post("/echo", hello.Echo).Validate(hello.EchoRequest)
```

```go
router.Post("/echo", hello.Echo, nil, middleware.Trim, middleware.Gzip())

// Becomes
router.Post("/echo", hello.Echo).Middleware(middleware.Trim, middleware.Gzip())
```

```go
router.Post("/echo", hello.Echo, hellorequest.Echo, middleware.Trim)

// Becomes
router.Post("/echo", hello.Echo).Validate(hello.EchoRequest).Middleware(middleware.Trim)
```

### Convention changes

This release brought changes to the conventions. Although your applications can still work with the old ones, it's recommended to make the change.

- Move `validation.go` and `placeholders.go` to a new `http/validation` package. Don't forget to change the `package` instruction in these files.
- In `main.go`, import your `http/validation` package instead of `http/request`.
- Validation rule sets are now located in a `request.go` file in the same package as the controller. So if you had `http/request/productrequest/product.go`, take the content of that file and move it to `http/controller/product/request.go`. Rule sets are now named after the name of the controller handler they will be used with, and end with `Request`. For example, a rule set for the `Store` handler will be named `StoreRequest`. If a rule set can be used for multiple handlers, consider using a name suited for all of them. The rules for a store operation are often the same for update operations, so instead of duplicating the set, create one unique set called `UpsertRequest`. You will likely just have to add `Request` at the end of the name of your sets.
- Update your route definition by changing the rule sets you use.
```go
router.Post("/echo", hello.Echo, hellorequest.Echo)

// Becomes
router.Post("/echo", hello.Echo).Validate(hello.EchoRequest)
```

### Validation changes

Although the validation changes are internally huge, there is only a tiny amount of code to change to update your application. You will have to update all your handlers accessing the `request.Rules` field. This field is no longer a `validation.RuleSet` and has been changed to `*validation.Rules`, which will be easier to use, as the rules are already parsed. Refer to the [alternative validation syntax](./basics/validation.html#alternative-syntax) documentation for more details about this new structure.

- The following rules now pass if the validated data type is not supported: `greater_than`, `greater_than_equal`, `lower_than`, `lower_than_equal`, `size`.

### Configuration changes

The new configuration system does things very differently internally, but should not require too many changes to make your project compatible. First, you will have to update your configuration files. Here is an example of configuration file containing all the core entries:

```json
{
  "app": {
    "name": "goyave_template",
    "environment": "localhost",
    "debug": true,
    "defaultLanguage": "en-US"
  },
  "server": {
    "host": "127.0.0.1",
    "maintenance": false,
    "protocol": "http",
    "domain": "",
    "port": 8080,
    "httpsPort": 8081,
    "timeout": 10,
    "maxUploadSize": 10,
    "tls": {
      "cert": "/path/to/cert",
      "key": "/path/to/key"
    },
  },
  "database": {
    "connection": "mysql",
    "host": "127.0.0.1",
    "port": 3306,
    "name": "goyave",
    "username": "root",
    "password": "root",
    "options": "charset=utf8mb4&collation=utf8mb4_general_ci&parseTime=true&loc=Local",
    "maxOpenConnections": 20,
    "maxIdleConnections": 20,
    "maxLifetime": 300,
    "autoMigrate": false
  }
}
```

If you were using any of the configuration entries above in your code, you should update the keys used in the calls of `config.Get()`, `config.GetString()`, `config.Bool()` and `config.Has()`. Keys are now **dot-separated** paths. For example, to access the database `host` entry, the key is `database.host`.

For more information, refer to the [configuration reference](./configuration.html#configuration-reference).

If you are using the `auth` package (basic auth, JWT), you will need to update your configuration entries too.

- `authUsername` becomes `auth.basic.username`
- `authPassword` becomes `auth.basic.password`
- `jwtExpiry` becomes `auth.jwt.expiry`
- `jwtSecret` becomes `auth.jwt.secret`

```json
{
  ...
  "auth": {
    "jwt": {
      "expiry": 300,
      "secret": "jwt-secret"
    },
    "basic": {
      "username": "admin",
      "password": "admin"
    }
  }
}
```

Finally, `config.Register()` function has changed signature. See the [configuration documentation](./configuration.html#custom-config-entries) for more details on how to migrate.

### Database changes

- Goyave has moved to [GORM v2](https://gorm.io/). Read the [release note](https://gorm.io/docs/v2_release_note.html) to learn more about what changed.
  - In your imports, replace all occurrences of `github.com/jinzhu/gorm` with `gorm.io/gorm`.
  - In your imports, replace all occurrences of `github.com/jinzhu/gorm/dialects/(.*?)` with `goyave.dev/goyave/v3/database/dialect/$1`.
  - Run `go mod tidy` to remove the old version of gorm.
- Factories now return `interface{}` instead of `[]interface{}`. The actual type of the returned value is a slice of the the type of what is returned by your generator, so you can type-assert safely.

```go
records := factory.Generate(5)
insertedRecords := factory.Save(5)

// Becomes
records := factory.Generate(5).([]*model.User)
insertedRecords := factory.Save(5).([]*model.User)
```

### Minor changes

- Recovery middleware now correctly handles panics with a `nil` value. You may have to update your custom status handler for the HTTP `500` error code.
- Log `Formatter` now receive the length of the response (in bytes) instead of the full body.
  - `log.Formatter` is now `func(now time.Time, response *goyave.Response, request *goyave.Request, length int) string`.
  - If you were just using `len(body)`, just replace it with `length`.
  - If you were using the content of the body in your logger, you will have to implement a [chained writer](./basics/responses.html#chained-writers).
- Removed deprecated method `goyave.CreateTestResponse()`. Use `goyave.TestSuite.CreateTestResponse()` instead.
- Although it is not a breaking change, chained writers should now implement `goyave.PreWriter` and call `PreWrite()` on their child writer if they implement the interface.

```go
func (w *customWriter) PreWrite(b []byte) {
	if pr, ok := w.Writer.(goyave.PreWriter); ok {
		pr.PreWrite(b)
	}
}
```

## v1.0.0 to v2.0.0

This first update comes with refactoring and package renaming to better fit the Go conventions.

- `goyave.Request.URL()` has been renamed to `goyave.Request.URI()`.
    - `goyave.Request.URL()` is now a data accessor for URL fields.
- The `helpers` package has been renamed to `helper`.
    - The `filesystem` package thus has a different path: `github.com/System-Glitch/goyave/v2/helper/filesystem`.

::: tip
Because this version contains breaking changes. Goyave had to move to `v2.0.0`. You need to change the path of your imports to upgrade.

Change `github.com/System-Glitch/goyave` to `github.com/System-Glitch/goyave/v2`.
:::
