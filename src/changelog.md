---
title: "Changelog"
description: "The detailed Goyave changelog"
---

# Changelog

:::tip Tip
You can also see the changelog on [Github](https://github.com/go-goyave/goyave/releases). 

You can be notified of new releases by enabling notifications on Github or by joining our [Discord](https://discord.gg/mfemDMc).
:::

[[toc]]

## v5.0.0

### Introduction

**Goyave v5** has been in the oven for over two years. With the first production applications deployed, a ton of issues and flaws revealed themselves, preventing real long-lived projects from cleanly evolving. The initial goals of the framework started to weaken the more the applications were developed and changed: the strong basis it promised to provide wasn't actually that strong. From this invaluable experience, I decided to go back to the drawing board and redesign the framework.

This new major version is an almost entire **rewrite** of the framework. In order to limit the frequency of releases containing breaking changes, all accumulated ideas for reworks and improvements that would introduce those were grouped in v5. This new major version doesn't only aims at fixing the outstanding issues and design flaws, but also improve on existing features by upgrading them to the latest available technology. Expect v5 to feel modern and to neatly integrate with all the new language features such as generics, file systems, structured logging, and more.

These release notes will be organized in categories. They will explain the overall change of direction for each area of the framework as well as shortly showcase the new or improved features. The list of changes may be incomplete as many features were rewritten entirely.

### Motivations

Among the many aspects that needed to be reworked, some of them stood out and fueled the initial drive to rewrite the framework.

#### Dependency coupling

Every layer and components of a v4 application had **strong dependency coupling**. The HTTP, business and database layers were all mixed up together. The framework was systematically imposing a dependency to itself, direct or indirect. Its locked-up architecture, entirely based on globals was hindering the more business-oriented applications. Those struggled to detach their domains from the rest of the application, and encountered obstacles every time they needed to handle more complex business logic.

For example: to access the database, you were forced to use the framework, which was loaded from a configuration system that also was handled by the framework. This created **a long chain of dependencies** that was hard to separate from the rest, even more so when it came to writing tests.

On top of that, the all-global architecture required a ton of **synchronization**, which were detrimental to the overall performance of the application.

#### Locked architecture

All components of the framework were strongly linked together and quite opaque, despite an initial effort made to make the framework flexible and hackable. In the end, many **non-elegant workarounds** had to be made in real-world scenarios. This made it harder to adapt an application to the constraints often encountered by companies developing their ecosystem and trying to solve real-world issues that needed deeper access to the inner-workings.

The validation system was one of the biggest, if not the biggest, culprit. It was very inconvenient to use compared to the new one brought with v5. The hacks required to make some advanced field comparison or business-logic validation were very fragile and hard to maintain. This design made it impossible to re-use code, and forced the hassle of creating a new validator for every single specific use-case.

The framework was also a bit too reliant on **magic** in some aspects. Many functions were using weak typing (`any`) and **reflection**, or even **string identifiers**, all for the sake of conciseness. But this came at a cost: no compile-time checks, hard code navigation, no completion, the need to rely on documentation all the time, etc. In the end, by trying to be concise for a better DX (developer experience), the framework sacrificed code cleanliness, reliability, readability, maintainability and actually ruined its DX this way.

#### Testing

All these issues accumulate and become a huge pain the moment you start trying to add tests to your project. They were very difficult to write, which is the exact opposite of what you want. Tests should be painless and as easy to read and maintain as possible. Also suffering from the locked architecture and mandatory dependency to the framework, they couldn't even be run in parallel. Almost nothing could be mocked because of the dependency coupling. This was in turn forcing you to use the database for your tests, which made tests even slower and complicated.

In short, the design of the framework prior to v5 treated tests as an after-thought despite how important they are.

#### Streamlining

There were many smaller and non-blocking issues as well. Together they made the entire development flow **awkward** by moments, like there was a missing piece to make the whole process fluid from start to finish.

The first one was the relation between the user-sent data and the internal data. Making use of the data sent by users was inconvenient and also quite unsafe, requiring a ton of type assertions and map navigation. This is very subpar compared to most Go applications which use structures. It also caused problems when interacting with the database.

Another issue was **error handling and debugging**. The framework was relying too much on `panic`, which is not a very sane nor idiomatic way to handle errors. Although it allowed for a pretty good debugging experience for developers with more precise stacktraces, a much better solution was possible. This solution wouldn't compromise on code quality for the sake of DX, again.

The last major one was the low **interoperability and control**, notably with the lack of access over the `context` API, or some missing configuration options and settings.

### Philosophy

The overall philosophy of the framework stays the same. Goyave remains an opinionated framework, focused on DX (developer experience) by enabling quick and enjoyable development by being expressive, reliable and complete. **The goal is to make business logic development as painless as possible by handling as many recurring things for developers as possible so they can focus on implementing what actually creates value for their company.**

#### New direction

However, there are some important evolutions in the general direction of the framework:
- v5 takes architecture and utilities one step further. At first glance, a typical application will be less simple to grasp. Therefore, **the "progessive" nature of the framework is no more.**
- Despite its opinionated nature, the new design tries to be **as open as possible**. The framework should not be a black box and developers should have no trouble making it their own effortlessly.
- The design should focus its efforts on creating tools that **simplify the reduction or elimination of the dependencies** between application layers and business layers.
- The design and development of the framework now assumes full focus on **catering to businesses and medium to large projects**.
- The development of the framework will now consider **real-world use-cases and scenarios** with more importance. No "quick and easy" solutions, tools or fancy gadgets will be developed from now on.
- The framework and documentation will expand even more on **architecture recommendations and good practices** to cover more questions developers could have when working on their project. The goal of an opinionated framework is to save time to its users, while giving them all the tools they need to do produce the best possible quality software.
- The open-source process has been revised to make contributions easier. Gathering and taking care of **a strong community** has always been very important. More efforts will be made in this direction.

### Architecture

### Server

### File systems

Go 1.16 introduced the `io/fs` package as well as support for embedded files and directories. These additions add a number of important benefits ranging from distribution packaging to storage abstraction. As v5 was already going to contain many breaking changes, the opportunity to integrate these new systems into the framework was taken. Every system or feature interacting with files in any way should now use file system interfaces. This allows developer maximum flexibility when working with files and makes it easier to write tests.

Thanks to file systems, static resources can be embedded into the compiled executable and external resources or storage can be seemlessly used.

- New interfaces:
	- `fsutil.FS`: combines `fs.ReadDirFS` and `fs.StatFS`. This is used to require versatile read-only file systems.
	- `fsutil.WorkingDirFS`: a file system that has a working directory for relative paths, get by the `Getwd()` method.
	- `fsutil.MkdirFS`: a writable file system able to create directories.
	- `fsutil.WritableFS`: a writable file system with an `OpenFile()` method.
	- `fsutil.RemoveFS`: a writable file system supporting file or directory deletion.
- `osfs.FS` is a complete implementation of the above interfaces for the local OS file system. 
- `fsutil.Embed` is a wrapper around `fs.ReadDirFS` used to enrich the `embed.FS` file system so they also implement `fs.StatFS` and `Sub()`. This is useful for serving embedded static resources, loading embedded language files, etc.
- `fsutil.GetMIMEType()` now takes a `fs.FS` as parameter and returns an error instead of panicking.
- `fsutil.FileExists()` and `fsutil.IsDirectory()` now take a `fs.StatFS` as parameter.
- `fsutil.File.Data` was removed. You now have to open the `File.Header` yourself.
- `fsutil.File.Save()` now takes a `fsutil.WritableFS` as parameter and returns an error instead of panicking.
- `fsutil.ParseMultipartFiles()` now takes a `[]*multipart.FileHeader` instead of a `*http.Request`.
- By default, configuration, language files and JWT keys are loaded with the `osfs.FS`, but options are available in all these features if you want to use a different file system.

### Configuration

### Routing

### Requests

### Responses

### Validation

### Structure conversion and mapping

The use of **DTO** (Data Transfer Object) and **model mapping** is now encouraged. This mechanism will help separate the data layer, reduce the risk of sensitive information leaks, and ease the communication between the different layers of your application. Working with strongly-typed structures 

In short:
- Services will receive and return DTOs only.
- Repositories will receive and return models only.
- There will be one DTO defined for each operation. (eg. CreateUser, UpdateUser, etc).
- Models should not be partially updated to avoid temporal inconsistencies. Each update should retrieve the entire record, use model mapping to change the necessary fields, and save the model.

**Changes:**
- `request.ToStruct()` was removed.
- The `reflectutil` package was removed.
- `typeutil.ToFloat64()` and `typeutil.ToString()` were removed.
- `typeutil.Convert()` new function converts anything into the desired type using JSON marshaling and unmarshaling. This allows raw validated request data to be safely converted to a DTO, or a model to be converted to a DTO.
- `typeutil.MustConvert()` does the same but panics in case of error.
- `typeutil.Copy()` new function deep-copies a DTO's non-zero fields into the given model. It is used for **model mapping**.

**Examples**:
```go
// Raw request data to DTO
requestDTO := typeutil.MustConvert[*dto.RegisterUser](request.Data)

// Model to DTO
userDTO := typeutil.MustConvert[*dto.User](user)

// Model mapping
userModel = typeutil.Copy(userModel, userDTO)
```

- The new type `typeutil.Undefined` is a utility type wrapping a generic value that can be used to differentiate between the absence of a field and its zero value, without using pointers. This handy type will help you easily handle optional fields in requests, because "undefined" is different from `nil`, which is also different from the zero-value of a type. All fields that are not required in a validated request should use this type in their corresponding DTO. A field that wasn't provided by the user in their request will not be copied by model mapping.

```go
type UpdateUser struct {
	Email typeutil.Undefined[string] `json:"email"`
	Name  typeutil.Undefined[string] `json:"name"`
}
```

### Authentication

### Database

### Localization

The simple localization system in Goyave already works for most cases so it didn't went through a big overhaul. It was mostly refactored for easier use and greater openness.

- The language system is now structured with two important elements:
	- `*lang.Languages` contains multiple loaded languages and defines a default language.
	- `*lang.Language` represents a single language and contains the translated text.
	- You can get a translated line directly from a `*lang.Language` or as before through `*lang.Languages` by specifying the language name.
- Language loading methods now take a file system as parameter. This allows the language files to be **embedded**.
- `request.Lang` is now a `*lang.Language` instead of a `string`. This means you can get a language line directly from the request language:
```go
request.Lang.Get("custom-line")
```
- The validation message keys for array elements were changed. Replace `.array` with `.element`.
- Type-dependent validators can also support the `object` type now.
- `fields.json` is now a `map[string]string`. There is no object with "name" nor "rules" anymore.

### Logging

Way before Goyave v5 was being designed, the question of better logs was already there for the framework. Instead of several basic loggers, a **unified** logger with **levels** would bring many benefits. At the time, many popular logging libraries existed but none of them aligned on a single interface. Go 1.21 introduced `log/slog`, a standard for **structured logging**. The choice of using this new standard and integrate it into the framework was made.

Thanks to structured logging, logs will be easier to read both in development and in production. The framework comes with a custom `slog` handler for development, which formats the logs in a human-readable way. In production, the logs will be output in the JSON format, which is very easy to parse by cloud service providers, making your logs easily readable and filterable.

All logs in Goyave v5 are now **unified** and can take full advantage of log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`). This means that Gorm also uses the same logger as the rest of the application. The format will now be consistent across your entire application.

- All logs are written to `os.Stderr` by default.
- Logging is not global anymore. Logger instances are now passed around, mostly through components or dependencies. You also have the option to pass logger instances through the `context.Context`.
- `goyave.Logger`, `goyave.ErrLogger` and `goyave.AccessLogger` were removed.
- `goyave.dev/goyave/v5/slog` defines `*slog.Logger`, a wrapper around the standard `*log/slog.Logger`. This wrapper helps gracefully handle errors and print them with more details.
- When debug mode (configuration `app.debug`) is disabled, the minimum log level is bumped to `Info` and the Gorm logger is disabled.
- The common and combined access logs middleware were changed:
	- `log.Formatter` now takes a `*log.Context` instead of many parameters.
	- `log.Formatter` now returns a message and a `[]slog.Attr` slice instead of just a message.
	- The access log writer now writes to the structured logger at the `Info` level. The message will remain the same, but `slog` attributes will be added to make the log richer.
	- These attributes won't be printed in debug mode to avoid clutter.

### Error handling

In previous versions, error handling was relying on `panic`. This had the advantage of centralizing error handling in the recovery middleware and getting precise stack traces. However, this approach wasn't very sane and not idiomatic. Going forward, the solution will be more idiomatic, easier to test and won't compromise on code quality, while improving the DX even more.

Developers are now encouraged to return errors all the way up the call stack. At the highest level, the HTTP handlers will report errors with `response.Error()`. Error handling will still be centralized in a status handler to make error reporting easier.

A new **error wrapping** mechanism was added. `goyave.dev/goyave/v5/util/errors` brings the `*errors.Error` type, which provide a convenient way to enrich errors with information useful for debugging and error reporting:
- Caller frames are collected when the error happens. The stack traces will always precisely point to the exact origin of the error.
- Any error **reason** can be used, be it a `string`, a `struct`, another `error`, `map`, `[]error`, `[]any`, etc.
- Multiple errors can be wrapped into one single error. Nested errors are also supported.
- `*errors.Error` is handled by the structured logger, which results in more detailed logs.

:::center
![Error wrapping diagram](/diagrams/error_handling.webp){data-zoomable}
:::

### Request parsing

Request parsing was one of the rigid features that were convenient in simple cases, but hard to work around for advanced usage. In its redesign, the focus was put on allowing finer control over it. 

- Request parsing is **not** a core middleware automatically executed on all requests anymore.
- This change allows more fine-grained control over request parsing. This middleware prevents upload streaming. Now that it can be removed, this use-case isn't blocked anymore.
- The request's body reader is not reset anymore after the parse middleware is executed.
- The max upload size can now be configured from the middleware (using `MaxUploadSize`) if you need to locally override the configuration entry `server.maxUploadSize`.
- The parse middleware now accepts any type of root element if the request body is JSON. It previously only accepted objects.
```go
router.GlobalMiddleware(&parse.Middleware{})
```

- The request's parsed body and query are not grouped in the same place anymore. They are now respectively stored in `request.Data` and `request.Query`.
- `request.Data` is now `any`. It previously always was an object (`map[string]any`).
- `request.Query` is a `map[string]any`.

### Compression

- `middleware.Gzip()` was replaced by the new `goyave.dev/goyave/v5/middleware/compress` package.
- The new `compress.Middleware` provides a generic basis for all types of compression and accepts multiple encoders. The encoder will be chosen depending on the request's `Accept-Encoding` header.
- Out-of-the-box, only the gzip encoder is available. It is however very easy to implement a custom encoder for other compression algorithms.

```go
compress := &compress.Middleware{
	Encoders: []compress.Encoder{
		&compress.Gzip{
			Level: gzip.BestCompression,
		},
	},
}
router.Middleware(compress)
```

### Tests

As explained earlier in the release notes, tests were suffering from many flaws making them incredibly inconvenient, slow, hard to maintain. Proper unitary tests were not possible neither because of all the dependencies imposed by the previous versions of the framework.

- Testing has been completely overhauled, and is now carefully considered in the design decisions.
- Test utilities are designed with parallelism in mind for better efficiency.
- Testing is now agnostic. You can use the testing library of your choice. You are not forced to use testify anymore.
- The working directory is not set to the projects root directory anymore.
- The `GOYAVE_ENV` environment variable is not set automatically anymore.
- The `goyave.TestSuite` and other testing utilities were removed. The remaining ones were moved to the `testutil` package.
- The new `testutil` package contains the new testing utilities.
	- You can easily create a test server with `testutil.NewTestServer` or `testutil.NewTestServerWithOptions`.
	- Tests servers are wrappers around `*goyave.Server`. They expose useful methods that allows you to test a request without starting the server and listening to a port or test a middleware. It can be passed around as the parent server for all your components.
	- When using a test server, the logs are automatically redirected to the test logs (`t.Log()`).
	- Test servers automatically close their database connection when their parent test ends.
- A `*goyave.Server` can run in transaction mode with `server.Transaction()`. All the SQL queries will be executed from inside a transaction that can be rolled back. Tests involving the database should use this feature to isolate each test and avoid conflicts or race conditions at the database level.
- The database can be **mocked** using `server.ReplaceDB()`.
- `testutil.ReadJSONBody()` new function helps reading and unmarshalling a test response body.
- `testutil.ToJSON()` new function is a shortcut to marshal anything and create a reader from the result. It can be used for HTTP request tests.
- Creating test requests and responses is easier and less restricted than before since more fields are exported and you don't require a test suite anymore.
- Multipart forms for file uploads as well as `testutil.CreateTestFiles` now take a file system as parameter, allowing to use embedded files or mocked file systems.
- Factories were updated.
	- Factories now take a generic parameter representing the type of the model they will generate;
	- The generator function is now expected to return a type matching the generic type of the factory instead of returning `any`.
	- As a result, type assertions are not required anymore with the results of `Save()` and `Generate()`.
	- Overrides now use the same copying mechanism as model mapping instead of relying on `mergo`.
- HTTP tests now simply use a `http.Request` generated with the standard `httptest` package instead of multiple custom methods (`Get()`, `Post()`, etc).

### Raw data exploration

Raw data exploration is mainly used in validation. The framework now allows any type of data to be sent as the root element of a request, so this mechanism had to be slightly changed to support that. On top of that, many methods were added to make exploration and comparison more convenient in validators, where they will be used more frequently with the revamp.

Raw data exploration using the `goyave.dev/goyave/v5/util/walk` package has received **minor changes**:
- `*Path.Name` is now a `*string` instead of `string` to better handle elements that don't have a name (such as array elements).
- Paths can now explore array root elements (paths such as `[]` or `[].field`).
- `walk.Path.Walk()` callback now receives a `*walk.Context` instead of `walk.Context`
- `walk.Path.First()` new method returns the `*walk.Context` for the first final element that matches the path.   
- `walk.Path.Depth()` new method returns the depth of the path.   
- `walk.Path.Truncate()` new method returns a clone of the n first steps of the path so the returned path's depth equals the given depth.
- `*walk.Path` now implements a `String()` methods that returns a string representation of the path.
- `walk.Context`'s new method `Break()` indicates the walker to stop early.
- `walk.MustParse()` new function returns a `*walk.Path` or panics if there is an error.

### Websocket

The new architectural changes were an opportunity to make websockets more in line with how regular controllers would be implemented.

- The connection close timeout is now configured by the `server.websocketCloseTimeout` entry.
- `websocket.Conn.CloseWithError()` doesn't change the returned message to the error message if debug is enabled. The message will always be "Internal Server Error".
- The connection close timeout is now shared between the close control message and the connection close handler. Previously, the timeout was reset after writing the close control message, effectively allowing double the value of the configured timeout.
- Websockets now use controllers implementing `websocket.Controller` instead of lone handlers. Controllers must implement a method `Serve(*websocket.Conn, *goyave.Request) error`. This way, websocket handlers also benefit from the fact they are components.
- Controllers can implement the `websocket.Registrer` interface to manually register the upgrade route if they want to.
- Upgraders are now created with `websocket.New(controller)`.
- Options `UpgradeErrorHandler`, `ErrorHandler`, `CheckOrigin`, `Headers` are replaced with interfaces that can be implemented by the controller.

### Filters

The filters library didn't allow decoupling of the HTTP layer and the data layer because of its dependency to the `*goyave.Request`. It was therefore impossible to move its uses to a repository, where they belongs. By creating a DTO for this specific use and changing the error handling, filters can now be properly integrated in the new architecture. They were also upgraded to take advantage of the generics.

- `filter.Settings`, `filter.Scope()`, `filter.ScopeUnpaginated()` now take a generic parameter representing the model being filtered.
- `filter.Settings.CaseInsensitiveSort` new option wraps the sort values in `LOWER()` if the column is a string, resulting in `ORDER BY LOWER(column)`.
- `filter.Settings.DefaultSort` new option allows to define a list of sorts to be used if the user request didn't contain any sort. 
- `filter.Settings.Scope()`, `filter.Settings.ScopeUnpaginated()`, `filter.Scope()`, `filter.ScopeUnpaginated()` now take a `*filter.Request` instead of a `*goyave.Request`. This request can be created from a HTTP query with the new function `filter.NewRequest(query)`.
- `filter.Settings.Scope()` and `filter.Scope()` now return an `error` instead of a `*gorm.DB`.
- `filter.Filter.Scope()`, `filter.Join.Scope()`, `filter.Sort.Scope()` now take a `filter.Blacklist` instead of `*filter.Settings`.
- `filter.Validation` is now a `goyave.RuleSetFunc`, and should be used with `route.ValidateQuery()`.
- The field `fields` in a request validated with `filter.Validation` will now always be a `[]string`.
- The page info and records SQL queries are now executed inside a transaction.
- Validation error messages names had a "goyave-filter-" prefix added. 

### Miscellaneous

- Minimum Go version will always be the second-to-latest version. At the time of release, this is 1.21.
- The template project has been simplified as much as possible to removed all the unnecessary code. When you start a project, the first thing you do shouldn't be to remove things you don't need.
- The `util/sliceutil` package was removed. Use [`samber/lo`](https://github.com/samber/lo) instead.
- `goyave.EnableMaintenance()`, `goyave.DisableMaintenance()` and `goyave.IsMaintenanceEnabled()` were removed. Their use-case was rare. They were removed to reduce bloat. This kind of maintenance mode should be handled by the proxy, not the application.