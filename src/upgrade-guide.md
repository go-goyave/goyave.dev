---
title: "Upgrade guide"
description: "This guide will help you upgrade a Goyave v4 application to v5"
---

# Upgrade guide

[[toc]]

## Introduction

:::danger
- It is **not advised** to upgrade an application using Goyave v4 to v5. Goyave v5 is an entire rewrite of the framework and is very different from the older versions. Upgrading to v5 will be time-consuming and error-prone.
- This upgrade guide may be incomplete. If you encounter anything that wasn't covered while upgrading your application, please open a pull request.
:::

:::info
- It is advised to read the new documentation and the v5 release notes before starting the upgrade process.
- This guide will walk you through the **minimal** upgrade path. Once your application is upgraded, it won't exactly match the new recommended directory structure and architecture, but will continue working as before.
- If you have any question or need help, don't hesitate to come and ask over on [discord](https://discord.gg/mfemDMc).
:::

## Preparation

Upgrading an existing application to v5 can be a long process. It is advised to start by refactoring progressively some aspects of your application first to make the transition easier.

First, you can import both v4 and v5 in your project at the same time because they have a different import path due to the major version being incremented. This way you can start using the new and updated tools partially.

```sh
go get -u goyave.dev/goyave/v5
```

The package identifier is identical, so you will need to add an **alias** when importing v5:
```go
import goyave5 "goyave.dev/goyave/v5"
import validation5 "goyave.dev/goyave/v5/validation"
//...
```

Every element of your application that is equivalent to a **component** in Goyave v5 should be refactored to be a `struct` with a constructor. For example, a constructor is not a simple set of functions anymore. Doing this will also help the next step of dependency decoupling.

### Controllers

```go
// http/controller/user/user.go
func Show(response *goyave.Response, request *goyave.Request) {
	//...
}
```
Becomes:
```go
// http/controller/user/user.go
type Controller struct{
	goyave5.Component
}

func NewController() *Controller {
	return &Controller{}
}

func (ctrl *Controller) Show(response *goyave.Response, request *goyave.Request) {
	//...
}
```

:::info
Don't forget to update the route registrer.
:::

### Validation rules

```go
// http/validation/validation.go
func validateCustom(ctx *validation.Context) bool {
	return false
}
```
Becomes:
```go
// http/validation/custom.go
type CustomValidator struct{ validation5.BaseValidator }

func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	return false
}

func (v *CustomValidator) Name() string { return "custom" }

func (v *CustomValidator) IsType() bool { return true }          // Only if needed
func (v *CustomValidator) IsTypeDependent() bool { return true } // Only if needed

func Custom() *CustomValidator {
	return &CustomValidator{}
}
```

Registering your rules changes:
```go
validation.AddRule("password", &validation.RuleDefinition{
	Function:           validatePassword,
	RequiredParameters: 0,
})
```
Becomes:
```go
validator := Custom()
validation.AddRule(validator.Name(), &validation.RuleDefinition{
	Function:           validator.Validate(),
	RequiredParameters: 0,     // Won't be needed anymore after v5 switch
	IsType:             validator.IsType(),
	IsTypeDependent:    validator.IsTypeDependent(),
	ComparesFields:     false, // Won't be needed anymore after v5 switch
})
```

### Middleware

```go
// http/middleware/custom.go
func CustomMiddleware(param, column string, model interface{}) goyave.Middleware {
	return func(next goyave.Handler) goyave.Handler {
		return func(response *goyave.Response, request *goyave.Request) {
			next(response, request)
		}
	}
}
```
Becomes:
```go
// http/middleware/custom.go
type Custom struct {
	goyave5.Component
}

func (m *Custom) Handle(next goyave.Handler) goyave.Handler {
	return func(response *goyave.Response, request *goyave.Request) {
		next(response, request)
	}
}
```

Route definitions change as follows:
```go
router.Middleware(middleware.Custom)
```
Becomes
```go
router.Middleware((&middleware.Custom{}).Handle)
```

### Status handler

```go
// http/controller/status/custom.go
func CustomStatusHandler(response *goyave.Response, request *goyave.Request) {
	//...
}
```
Becomes:
```go
// http/controller/status/custom.go
type CustomStatusHandler struct {
	goyave5.Component
}

func (*CustomStatusHandler) Handle(response *Response, request *Request) {
	//...
}
```

Route definitions change as follows:
```go
router.StatusHandler(status.CustomStatusHandler)
```
Becomes:
```go
router.Middleware((&status.CustomStatusHandler{}).Handle)
```


### Dependency decoupling

The next step is to **decouple** global dependencies from your **components**.

Check for every use of `goyave.dev/goyave/v4/database`, `goyave.dev/goyave/v4/lang`, `goyave.dev/goyave/v4/config` and `goyave.Logger` / `goyave.ErrLogger`, `goyave.AccessLogger`.
	
For languages, we will create a simple adapter that acts as a proxy to the global language package. With its structure nature, we will be able to use it as a dependency in our components. It will be easy to replace with the actual v5 language implementation later:
```go
// lang/lang.go
package lang

import glang "goyave.dev/goyave/v4/lang"

type Languages struct{}

func (l *Languages) Get(lang string, line string, placeholders ...string) string {
	return glang.Get(lang, line, placeholders...)
}
```

Now let's move all these global dependencies to **struct fields**:

```go
type Controller struct{
	goyave5.Component
	db *gorm.DB
	lang *lang.Languages
	customConfigEntry string
}

func NewController(db *gorm.DB, lang *lang.Languages, customConfigEntry string) *Controller {
	return &Controller{
		db:                db,
		lang:              lang,
		customConfigEntry: customConfigEntry,
	}
}
```

:::info
- For configuration, you are advised to only pass the actual values and not a configuration object.
- Don't forget to update where your components were previously used and how they are initialized.
:::

### Switching to v5

- Replace import `goyave.dev/goyave/v4` to `goyave.dev/goyave/v5` and remove all the aliases previously defined.
- Remove the language adapter previously implemented. Remove it from the components dependencies as well.
- Update route definitions by passing directly your middleware and status handlers instead of their `Handle` method.
- Remove all uses of `validation.AddRule()`.
- From your components
	- if you have access to the `goyave.Request`, use `request.Lang.Get()` instead of the language adapter. Otherwise simply replace the use of `lang` with `Lang()` (accessible through the `goyave.Component` composition).
	- you don't necessarily need to remove the `db` dependency. But if you want to, you can now access it from `component.DB()`.
	- **Make sure your components are initialized**. If they are not passed to the framework through methods such as `router.Controller()`, `router.Middleware()`, etc, they probably won't be initialized, which will prevent them from accessing the server's resources.
- Logging now uses structured logs. Replace the uses of `Println()` by `Info()`.

## Initialization

- If your configuration was loaded manually, it now returns a `*config.Config` and an `error` instead of just an error.
- Create a new `*goyave.Server`, register the routes and the startup, shutdown and signal hooks.
- Start the server with `server.Start()`.
- `*goyave.Error` has been **removed**. This means the server doesn't return exit codes anymore. You can use the exit codes of your choice. Exit codes that were returned didn't really bring value. The error message in the logs is more important.
- Errors returned by the server are now always of type `*errors.Error`. Which should be logged either with a Goyave `*slog.Logger` or like so if you don't already have access to the logger:
```go
fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
```

**Example**:

```go
goyave.RegisterStartupHook(func() {
	goyave.Logger.Println("Server is listening")
})
goyave.RegisterShutdownHook(func() {
	goyave.Logger.Println("Server is shutting down")
})

if err := goyave.Start(route.Register); err != nil {
	os.Exit(err.(*goyave.Error).ExitCode)
}
```

Becomes:
```go
server, err := goyave.New(opts)
if err != nil {
	fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
	os.Exit(1)
}

server.Logger.Info("Registering hooks")
server.RegisterSignalHook()

server.RegisterStartupHook(func(s *goyave.Server) {
	server.Logger.Info("Server is listening", "host", s.Host())
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
```

## Configuration

The following configuration entries changes may affect your application:
- `server.protocol`, `server.httpsPort` and `server.tls` were **removed**: protocol is only `http` as TLS/HTTPS support has been removed because Goyave applications are most of the time deployed behind a proxy.
- `server.timeout` has been **split**: `server.writeTimeout`, `server.readTimeout`, `server.idleTimeout`, `server.readHeaderTimeout`, `server.websocketCloseTimeout`.
- `server.maintenance`
- `database` entries do not have a default value anymore. They were previously using default values for MySQL.
- New entries `database.defaultReadQueryTimeout` and `database.defaultWriteQueryTimeout` add a timeout mechanism to your database operations. If you have long queries, increase their values. Set to `0` to disable the timeouts.
- `auth.jwt.rsa.password` was **removed**.

## Requests

- `request.ToStruct()` was removed, use `typeutil.Convert()` instead.
- `request.Data` is now `any` instead of `map[string]any`. You should use safe type assertions before use.
- Query data is not in `request.Data` anymore, it is now split in `request.Query`.
- `Request.Request().Context()` can be replaced with `request.Context()`.
- `request.URI()` was renamed `request.URL()`.
- Request accessors such as `Has()`, `String()`, `Numeric()`, etc were all removed.
- `request.CORSOptions()` was removed. You can access CORS options via the route meta: `request.Route.Meta[goyave.MetaCORS].(*cors.Options)`.

## Responses

- `response.HandleDatabaseError(db)` becomes `!response.WriteDBError(err)`
	- `WriteDBError()` returns `true` if there is an error and that you should `return`. This is the **opposite** of `HandleDatabaseError`.
- `response.Error()`, `response.JSON()`, `response.String()` etc do not return an error anymore.
- `response.Redirect()` was removed. You can replace by `http.Redirect(response, request.Request(), url, http.StatusPermanentRedirect)`.
- Template rendering was removed. `response.Render()` and `response.RenderHTML()` are not available anymore. If you were using them, you should now render manually and use `response.Write()`.
- `response.GetError()` now returns `*errors.Error` instead of `any`.
- `response.GetStacktrace()` was removed. You can now access the stacktrace from the error itself.
- `response.File()` and `response.Download()` now take a file system as first parameter. Use `&osfs.FS{}` to keep the previous behavior.

## Error handling

- Try removing the uses of `panic`. Instead, make your methods/functions return an error all the way up to a HTTP handler, which will use `response.Error()`.
- Use **error wrapping** everywhere an error is returned.

## Routing

- The route registrer now takes server as parameter: `func Register(server *goyave.Server, router *goyave.Router)`
- `request.Params` becomes `request.RouteParams`.
- `request.Route()` becomes `request.Route`.
- `router.Route()` now takes a string slice as first parameter instead of pipe-separated list of methods.
- `route.Validate` is now split in two: `route.ValidateQuery()` and `route.ValidateBody()`.
- The routing algorithm has slightly changed to prevent some conflicts between two subrouters whose prefixes start with the same characters. Also, when a subrouter matches but none of its routes match, the other subrouters won't be checked (no turning back).
- The parse middleware is not a core middleware anymore. You need to add it as a global middleware: `router.GlobalMiddleware(&parse.Middleware{})`
- `router.Static()` now takes a file system as first parameter and returns the generated `*Route`.

## Database

- `database.View` was removed because it isn't of any use anymore after the testing changes.
- Database initializers were removed, make the changes on your database after `server.New()` and before `server.Start()`.
- `database.RegisterModel()` was removed, it isn't of any use anymore after the removal of auto migrations and the testing changes.
- Auto migrations were removed. You can still use auto migrations with Gorm if you want, but this is discouraged.
- `database.Paginator` now takes a generic parameter representing the model to paginate.
- The Gorm instance is now using the Goyave logger instead of the default one. If you tweaked the Gorm logger, make sure to update your implementation, preferably using `*database.Logger`. 

## Localization

- The validation message keys for array elements were changed. Replace `.array` with `.element`.
- Type-dependent validators can also support `object` now.
- `lang.Get(request.Lang)` becomes `request.Lang.Get` or `component.Lang().Get()`
- `fields.json` is now a `map[string]string`. There is no object with "name" nor "rules" anymore.

## Validation

- The validation of query and body is now split in two:
	- `route.ValidateQuery()` and `route.ValidateBody()`. The first call of either of those will automatically add the validation middleware to the route.
	- The validation error response body is slightly different:
		- Instead of `validationError`, the key is now `error` to be consistent with the rest of the error handlers.
		- Here is an example of the new format. The highlighted lines show the differences:
```json{1-4,23-24}
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
- `validation.Validate` and `validation.ValidateWithExtra` becomes `validation.Validate(opts)`.
	- The `validation.Options` contains several options, as well as external dependencies such as the language, the database, the config, etc. Those will be passed to the validators so they can access them just like any regular component.
	- `isJSON` becomes `ConvertSingleValueArrays`, which does the same but the logic is different so the bool value will be the opposite.
	- This function now also returns a slice of errors. Those are not validation errors, they are actual execution errors.

```go
data := map[string]any{
	"string": "hello world",
    "number": 42,
}

ruleSet := validation.RuleSet{
	"string": validation.List{"required", "string"},
	"number": validation.List{"required", "numeric", "min:10"},
}

errors := validation.Validate(data, ruleSet, true, request.Lang)
```
Becomes:
```go
// "ctrl" here is a Component 

ruleSet := validation.RuleSet{
	{Path: validation.CurrentElement, Rules: validation.List{validation.Required(), validation.Object()}},
	{Path: "string", Rules: validation.List{validation.Required(), validation.String()}},
	{Path: "number", Rules: validation.List{validation.Required(), validation.Float64(), validation.Min(10)}},
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
```

- Validation is not always executed last as it used to. It is now executed following the same rules of ordering as regular middleware: you can now chose when validation occurs in the middleware stack. Make sure you call `ValidateBody`/`ValidateQuery` after your permission/auth middleware.
- The order in which fields are validated is now guaranteed and can be controlled by the developer. Make sure your rule sets or custom rules don't rely on other fields that need conversion (`float64`/`int`). Adjust validation order or your custom rules accordingly.
- The `PostValidationHooks` were removed. Use a middleware executed after the validation middleware to get the same effect.
- The root element of the data under validation can now be anything, not necessarily an object. Make sure to add the `Object()` validator to all your requests on the path `validation.CurrentElement`.
- Some of the structures were renamed to make more sense considering the fact that the root element is not always an object anymore:
	- `validation.Errors` is now `validation.FieldsErrors`.
	- `validation.FieldErrors` is now `validation.Errors`.
- A validation "rule" is now named a "validator".

### Custom rules

- `ctx.Data` is now `any` instead of `map[string]any`. Use safe type-assertions if needed.
- `ctx.Extra["request"]` becomes `ctx.Extra[validation.ExtraRequest{}]`
- `ctx.Extra` is **not** scoped to the current validator only anymore. The same reference given in `Options.Extra` is shared between all validators. Make sure your custom validators won't conflict.
- Validator instances are **not** meant for re-use. Make sure to not persist any data inside a validator.
- `ctx.Valid()` becomes `ctx.Invalid` (the boolean value is thus inverted).
- `ctx.Rule` was removed. `ctx.Rule.Params` becomes validator struct fields. The values are passed to the validator constructor.
- Don't `panic` inside validators. If you need to report an error, use `Context.AddError()`.

```go
func validateCustom(ctx *validation.Context) bool {
	if !ctx.Valid() {
		return false
	}

	value, err := strconv.ParseInt(ctx.Rule.Params[0], 10, 64)
	if err != nil {
		panic(err)
	}

	ok, err := checkValue(ctx.Value, value)
	if err != nil {
		panic(err)
	}
	return ok
}
```
Becomes:
```go
type CustomValidator struct{
	validation.BaseValidator
	Value int
}

func (v *CustomValidator) Validate(ctx *validation.Context) bool {
	ok, err := checkValue(ctx.Value)
	if err != nil {
		ctx.AddError(errors.New(err))
		return false
	}
	return false
}

func Custom(value int) *CustomValidator {
	return &CustomValidator{
		Value: value
	}
}
```

-  The concept of **placeholders** in validation has changed:
	- Placeholders are not global functions (replacer function) anymore: `validation.SetPlaceholder()` was removed. All built-in placeholders were therefore also removed. Some of your validation error messages for your custom rules may be broken as a result unless you add them back as explained below.
	- The `:field` placeholder remains unchanged.
	- Each validator returns it's own placeholder associative slices with an implementation of `MessagePlaceholders(*validation.Context) []string`.

```go
validation.SetPlaceholder("value", func(fieldName, language string, ctx *validation.Context) string {
	return ctx.Rule.Params[0]
})
```
Becomes:
```go
func (v *CustomValidator) MessagePlaceholders(_ *validation.Context) []string {
	return []string{
		":value", strconv.Itoa(v.Value),
	}
}
```

### Rule sets

- The rule sets definition has completely changed.
	- Rule sets are not meant for re-use anymore. A new rule set should be generated for each request. This is why `route.ValidateBody()` and `route.ValidateQuery()` take a **function** as parameter: `func(*Request) validation.RuleSet`.
	- Rules (now called "validators"), are now struct instances. They are not identified by strings anymore.
	- Rule sets don't have any alternative syntax anymore.
	- Rule sets are **slices**. The order of validation is the order of the slice returned by the function. The only exception being the array elements, which will always be executed before their parent so arrays can be validated recursively and properly converted.
	- `validation.CurrentElement` is now effective everywhere, even out of composition. The root element under validation can be anything, not necessarily an object. Every rule set should contain some validators for the `validation.CurrentElement` path.
- The convention for the file in which the validation rules changed from `request.go` to `validation.go`.
- When using composition, the validators inside the composed rule set will be executed **relatively** to the element. `ctx.Data` will not be equal to the root data but to the parent element linked to the composed rule set. This affects comparison rules, whose comparison paths will now be **relative**.

```go
// http/controller/request.go
var (
	InsertRequest validation.RuleSet = validation.RuleSet{
		"email":    validation.List{"required", "string", "email", "between:3,100", "unique:users"},
		"username": validation.List{"required", "string", "between:3,100", "unique:users"},
		"image":    validation.List{"nullable", "file", "image", "max:2048", "count:1"},
		"password": validation.List{"required", "string", "between:6,100"},
	}
)
```
Becomes:
```go
// http/controller/validation.go
import (
	"gorm.io/gorm"
	"goyave.dev/goyave/v5"
	v "goyave.dev/goyave/v5/validation"
)

func InsertRequest(_ *goyave.Request) v.RuleSet {
	return v.RuleSet{
		{Path: v.CurrentElement, Rules: v.List{v.Required(), v.Object()}},
		{Path: "email", Rules: v.List{
			v.Required(), v.String(), v.Email(), v.Between(3, 100),
			v.Unique(func(db *gorm.DB, val any) *gorm.DB {
				return db.Table("users").Where("email", val)
			}),
		}},
		{Path: "username", Rules: v.List{
			v.Required(), v.String(), v.Between(3, 100),
			v.Unique(func(db *gorm.DB, val any) *gorm.DB {
				return db.Table("users").Where("username", val)
			}),
		}},
		{Path: "image", Rules: v.List{
			v.Required(), v.File(), v.Image(), v.Max(2048), v.FileCount(1),
		}},
		{Path: "password", Rules: v.List{
			v.Required(), v.String(), v.Between(6,100), 
		}},
	}
}
```

### Rules

As said before, "rules" are now named "validators". Some of them were changed significantly but most of them keep the same behavior.

- Numeric rules now let you pick the exact Go type you want. The new validators will automatically check that the input value fits inside the corresponding type.
	- `integer` becomes: `Int()`, `Int8()`, `Int16()`, `Int32()`, `Int64()`, `Uint()`, `Uint8()`, `Uint16()`, `Uint32()`, `Uint64()`.
	- `numeric` becomes: `Float32()`, `Float64()`.
- `Array()` doesn't have type parameters anymore. To validate array elements, add a path entry matching the array elements.
- `Size()` validator and its derivatives such as `Min()`, `Max()`, etc now also work with objects and will validate its number of keys.

## Authentication

- The authentication middleware now use route meta to identify if a route requires authentication or not. You can now use the authentication middleware as a global middleware, and mark each router or route with `SetMeta(auth.MetaAuth, true)`.
- The authenticator middleware now takes a generic parameters, which represent the authenticated user's DTO.
- Authenticators now use constructors and depend on a service. If you are initializing them like so `&auth.JWTAuthenticator{}`, you should now use `auth.NewJWTAuthenticator(userService)`.
- Struct tags `auth:"username"` and `auth:"password"` are not used anymore. Authentication now works with a user **service**. Refer to the [authentication documentation](/advanced/authentication.html) for more details.
- `auth.FindColumns` was removed.
- Custom authenticators now take a generic parameter representing the authenticated user's DTO, and a user service parameter allowing them to fetch the user. Refer to the [authentication documentation](/advanced/authentication.html#custom-authenticator) for more details.
- Support for password-protected RSA keys has been dropped.

## Websockets

- Websockets now use `New()` with a controller interface. Websocket controllers should now be **components** implementing a method `Serve(*websocket.Conn, *goyave.Request) error`.
- The following websocket options are now interfaces that can be implemented by the websocket controller: `UpgradeErrorHandler`, `ErrorHandler`, `CheckOrigin`, `Headers`.
- Refer to the [websocket documentation](/advanced/websockets.html#upgrade-options) for more details.

## Tests

- The new `testutil` package contains the testing utilities.
- You are not forced to used `testify` anymore. You can now use the testing framework of your choice.
- `goyave.TestSuite` was removed.
	- You can generate test request and responses without having to use a suite with `testutil.NewTestRequest()` and `testutil.NewTestResponse()`.
	- Use the `testutil.NewTestServer()`.
	- It is not required to run a server (and listen to a port) anymore to test your routes. See the [testing documentation](/advanced/testing.html#http-tests) for more details.
	- The `GOYAVE_ENV` environment variable is not set automatically anymore.
	- The working directory is not automatically changed anymore.
	- Tests can now safely run in parallel.
- `database.Factory` now takes a generic parameter representing the model to generate. Generator functions should now a return a pointer to the actual model type instead of `any`.

**Example**
```go
suite.RunServer(route.Register, func() {
	resp, err := suite.Get("/hello", nil)
	suite.Nil(err)
	suite.NotNil(resp)
	if resp != nil {
		defer resp.Body.Close()
		suite.Equal(200, resp.StatusCode)
		suite.Equal("Hi!", string(suite.GetBody(resp)))
	}
})
```
Becomes:
```go
server := testutil.NewTestServerWithOptions(t, goyave.Options{Config: config.LoadDefault()})
server.RegisterRoutes(route.Register)

request := httptest.NewRequest(http.MethodGet, "/hello", nil)
response := server.TestRequest(request)
defer response.Body.Close()
// assertions
```

## Miscellaneous

- The `goyave.dev/filter` lib was updated and some of the design has changed.
	- `DefaultSort` is now an option. Use it instead of altering the request's data/query before filtering.
	- `Scope()` now use a `*filter.Request` instead of reading directory from the HTTP request. Use `filter.NewRequest(request.Query)` to create one.
	- `Scope()` now returns an error instead of the database instance result.
	- `filter` query field is now always a `[]string` slice (not `string`).
	- Validation error messages names had a "goyave-filter-" prefix added. If you overrode those messages, make sure to update the names of the entries.
- `fsutil.File.Data` was removed. You should open and read the `fsutil.File.Header.Open()` instead.
- Functions from the `fsutil` package now take a file system as parameter.
- `util/walk`
	- `walk.Path.Walk()` callback now takes a pointer `*walk.Context`.
- The commom and combined access loggers now output to the structured logger. If you have services parsing your logs, they should be updated accordingly.
- `goyave.Logger`, `goyave.ErrLogger` and `goyave.AccessLogger` were removed. If you were using a custom logger, make sure it supports structured logging, and replace `server.Logger` instead.
- The Gzip middleware was removed and replaced by the `compress.Middleware`. See the [documentation](/basics/middleware.html#compress) for information about its new usage.
- The `util/reflectutil` package was removed.
- The `util/sliceutil` package was removed. Use [`samber/lo`](https://github.com/samber/lo) instead.
- `util/typeutil`'s functions `ToFloat64()` and `ToString()` were removed.
- `goyave.BaseURL()` and `goyave.ProxyBaseURL()` were removed. Use `server.BaseURL()` and `server.ProxyBaseURL()` instead.
- `goyave.GetRoute()` was removed. Use `router.GetRoute()` instead. The router can be retrieved from a request with `request.Route.GetParent()`.
- `goyave.EnableMaintenance()`, `goyave.DisableMaintenance()` and `goyave.IsMaintenanceEnabled()` were removed.
