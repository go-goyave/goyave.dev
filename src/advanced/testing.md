---
title: "Testing"
description: "Goyave is test framework agnostic. You can use any testing library you want and won't be limited. To make testing easier, Goyave provides some test utilities located in the goyave.dev/goyave/v5/util/testutil package."
---

# Testing

[[toc]]

## Introduction

Goyave is test framework agnostic. You can use any testing library you want and won't be limited. To make testing easier, Goyave provides some test utilities located in the `goyave.dev/goyave/v5/util/testutil` package.

## Test servers

`*testutil.TestServer` is a wrapper around `*goyave.Server` that provides useful functions for testing.

- Create test requests
- Create test responses
- Test an endpoint without starting the server and listen on a network port
- Test middleware
- Discard logs to make them silent by default
- Load the config from the project's root directory easily
- Run the tests inside a transaction that can be easily rolled back

Create a new test server using `NewTestServer()` or `NewTestServerWithOptions()`. You can then use this server as root component for your controllers, middleware, and other components.

```go
func TestSomething(t *testing.T) {
	server := testutil.NewTestServer(t, "config.test.json")

	// or

	cfg := config.LoadDefault()
	cfg.Set("app.debug", false)
	opts := goyave.Options{
		Config: cfg,
		//...
	}
	server := testutil.NewTestServerWithOptions(t, opts)

	//...
}
```

:::info
- By default, the language files are loaded from the project's root directory, identified by the presence of a `go.mod` file.
- The configuration path given in `NewTestServer()` is relative to the project's root directory.
- Using `NewTestServerWithOptions()` without specifying a configuration in the options will attempt to load the configuration file relative to the current package (not relative to the project's root).
- Test servers are **concurrently unsafe**. Don't use one single instance across multiple tests.
:::

### Transaction mode

`server.Transaction()` replaces the root DB instance of the server with a transaction. This way, all database requests using the server's DB will be executed inside of it and won't have any side-effect or clash with concurrent tests running in parallel.

A `rollback` function is returned. It is advised to call it inside a **test cleanup**. The original database instance is restored after the transaction is rolled back.

```go
func TestSomething(t *testing.T) {
	server := testutil.NewTestServer(t, "config.test.json")
	rollback := server.Transaction(&sql.TxOptions{})
	t.Cleanup(rollback)

	//...
}
```

### Mocking database

If you want to use database mocks, for example with the [`go-sqlmock` library](https://github.com/DATA-DOG/go-sqlmock), you can force a test server to use a custom DB dialector with `server.ReplaceDB()`.

First create your mock, then use it to create the **Gorm dialector** of your choice (here Postgres).

```go
import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/config"
	"goyave.dev/goyave/v5/util/testutil"
)

func TestMockDB(t *testing.T) {
	// Important! Disable prepared statements for mock expectations to work
	cfg := config.LoadDefault()
	cfg.Set("database.config.prepareStmt", false)

	server := testutil.NewTestServerWithOptions(t, goyave.Options{Config: cfg})

	mockDB, mock, err := sqlmock.New()
	if err != nil {
		panic(err)
	}
	dialector := postgres.New(postgres.Config{
		DSN:                  "mock_db",
		DriverName:           "postgres",
		Conn:                 mockDB,
		PreferSimpleProtocol: true,
	})

	err = server.ReplaceDB(dialector)

	//...

	mock.ExpectClose()
}
```

:::tip
Test servers automatically close the database in a test cleanup hook. If you are using `go-sqlmock`, this will generate an error for unexpected `Close` unless you add `mock.ExpectClose()` at the very end of your test.
:::

### Logs

The default logger for test servers is `slog.DiscardLogger()`, which outputs to `io.Discard`, making logs silent.

You may want to print logs coming from your tests for functional reasons or for debugging. `testutil.LogWriter` is an implementation of `io.Writer` that redirects logs to `testing.T.Log()` for better readability.

```go
func TestSomething(t *testing.T) {
	opts := goyave.Options{
		Logger: slog.New(slog.NewHandler(true, &testutil.LogWriter{T: t})),
	}
	server := testutil.NewTestServerWithOptions(t, opts)
	//...
}
```

## HTTP Tests

You may want to write tests that simulate how a client would interact with your API through HTTP calls. In order to do so, use the test server's `TestRequest(*http.Request)` method. It will execute the request all the way from the router's `ServeHTTP()` implementation. Therefore, the request's lifecycle will be executed from start to finish.

For this type of tests, it is advised to **mock** your services. In the following example, we will test the "show" route for a user, which is supposed to return a user by its ID.

```go
// http/controller/user/user_test.go
package user

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/config"
	"goyave.dev/goyave/v5/util/testutil"
	"my-project/dto"
	"my-project/service"
)

type MockService struct{}

func (*MockService) First(_ context.Context, id uint) (*dto.User, error) {
	return &dto.User{
		ID: id,
		Name: "John Doe",
		Email: "johndoe@example.org",
	}, nil
}

func (*MockService) Name() string {
	return service.User
}

func TestShowUser(t *testing.T) {
	server := testutil.NewTestServerWithOptions(t, goyave.Options{Config: config.LoadDefault()})

	server.RegisterService(&MockService{})
	server.RegisterRoutes(func(_ *goyave.Server, r *goyave.Router) {
		r.Controller(&Controller{})
		// The controller registers /users/{userID:[0-9+]}
	})

	request := httptest.NewRequest(http.MethodGet, "/users/123", nil)
	response := server.TestRequest(request)
	defer response.Body.Close()

	//...
}
```

:::tip
You can use `testutil.ToJSON()` to quickly marshal anything and create a reader from the result that can be used as your test request's body. Don't forget to set the `Content-Type: application/json` header to your request.
:::

### JSON responses

To make testing JSON response easier, `testutil.ReadJSONBody[T](io.Reader)` helps you unmarshal a response's body into the type of your choice in a neat one-liner:

```go
user, err := testutil.ReadJSONBody[*dto.User](response.Body)
```

You can then easily make assertions on the returned `user` DTO to check if it meets expectations. If you prefer, you can also use maps instead of structures. But as your controllers should return marshaled DTOs, you should expect a response body that correctly unmarshals into the same DTO type.

## Testing handlers

You can test handlers without having to simulate an entire HTTP request by generating a test `*goyave.Request` and `*goyave.Response`.

```go
func TestShowUser(t *testing.T) {
	cfg := config.LoadDefault()
	server := testutil.NewTestServerWithOptions(t, goyave.Options{Config: cfg})

	request := server.NewTestRequest(http.MethodGet, "/users/123", nil)
	request.RouteParams["userID"] = "123"
	response, recorder := server.NewTestResponse(request)

	ctrl := &Controller{}
	ctrl.Init(server.Server)
	ctrl.Show(response, request)

	result := recorder.Result()
	defer result.Body.Close()

	user, err := testutil.ReadJSONBody[*dto.User](result.Body)
}
```

:::info
If you are not using a test server, you can generate your request and response with `testutil.NewTestRequest()` and `testutil.NewTestResponse()`.

- `server.NewTestRequest()` automatically sets the request's `Lang` to the default server language. If you are using `testutil.NewTestRequest()`, the request's `Lang` will **not** be set. 
- `*goyave.Response` requires a `*goyave.Server` in order to work. `testutil.NewTestResponse()` will create a temporary test server using the default configuration, used only for this `*goyave.Response` instance.
:::

## Testing middleware

You can unit-test middleware using `server.TestMiddleware()`. This function executes the given request and returns the response. The given `procedure` callback is the `next` handler passed to the middleware being tested, and can be used to make assertions. Remember that if your middleware is **blocking**, the callback won't be called. The request will go through the entire lifecycle like a regular request, and the middleware will be initialized automatically.

```go
func TestMiddleware(t *testing.T) {
	server := testutil.NewTestServerWithOptions(t, goyave.Options{Config: config.LoadDefault()})

	request := server.NewTestRequest(http.MethodGet, "/path", nil)
	response := server.TestMiddleware(&CustomMiddleware{}, request, func(response *goyave.Response, _ *goyave.Request) {
		// The middleware passed
		// ...
		response.Status(http.StatusOK)
	})
	defer response.Body.Close()
	//...
}
```

:::info
Note that the given request is **cloned** when using `TestMiddleware`. If the middleware alters the request object, these changes won't be reflected on the input request. You can do your assertions inside the `procedure`.
::: 

## Multipart and file upload

You may need to test requests requiring file uploads. The best way to do this is using Go's `multipart.Writer`. Adding files to such forms is made easier by `testutil.WriteMultipartFile()`.

```go
body := &bytes.Buffer{}
writer := multipart.NewWriter(body)
writer.WriteField("textField", "value")
err := testutil.WriteMultipartFile(writer, &osfs.FS{}, "test_file.txt", "fileField", "test_file.txt")
if err != nil {
	t.Fatal(err)
}
if err := writer.Close(); err != nil {
	t.Fatal(err)
}

request := httptest.NewRequest(http.MethodPost, "/file-upload", body)
// Don't forget to set the "Content-Type" header!
request.Header.Set("Content-Type", writer.FormDataContentType())
//...
```

:::tip
`testutil.WriteMultipartFile()` and all file-related features accept [file systems](/advanced/file-systems.html). Here, `&osfs.FS{}` represents the local OS file system.
:::

If you want to use files with `NewTestRequest()`, you will have to generate `[]fsutil.File` using `testutil.CreateTestFiles()`. This function will create the files in the same way they are obtained in real scenarios. 

```go
request := testutil.NewTestRequest(http.MethodPost, "/file-upload", nil)
	
files, err := testutil.CreateTestFiles(&osfs.FS{}, "file_1.txt", "file_2.txt")
if err != nil {
	t.Fatal(err)
}

request.Data = map[string]any{
	"files": files,
}
```

:::info
`testutil.CreateTestFiles()` paths are relative to the caller, not relative to the project's root directory.
:::

## Factories

Factories help you generate records for testing purposes, and save them to a database easily.

A factory uses a **generator** function, which will create one random record of the desired model. You can use any fake data generator library. In this example, we are using [go-faker](https://github.com/go-faker/faker).

Generator functions are written inside the `database/seed` package.

```go
// database/seed/user.go
package seed

import (
	"github.com/go-faker/faker/v4"
	"github.com/go-faker/faker/v4/pkg/options"

	"my-project/database/model"
)

func UserGenerator() *model.User {
	user := &model.User{}
	user.Name = faker.Name()

	user.Email = faker.Email(options.WithGenerateUniqueValues(true))
	return user
}
```
```go
// database/seed/seed.go
func Seed(db *gorm.DB) {
	userFactory := database.NewFactory(UserGenerator)
	
	 // Generate 10 users without inserting them
	users := userFactory.Generate(10)

	// Generate and insert 10 users
	insertedUsers := userFactory.Save(db, 10)

	//...
}
```

Generators can also create associated records. Associated records should be generated using their respective generators. In the following example, we are generating users for an application allowing users to write blog posts.

```go
func UserGenerator() *model.User {
	user := &model.User{}

	// Generate user fields...

	// Generate between 0 and 10 blog posts
	user.Posts = database.NewFactory(PostGenerator).Generate(rand.Intn(10))
	return user
}
```

### Overrides

It is possible to override some of the generated data if needed, for example if you need to test the behavior of a function with a specific value. All the non-zero fields of the given override structure will be copied into all generated records. The copy is **deep**, meaning all nested fields will be copied.

```go
userOverride := &model.User{
	Name: "Jérémy",
}

userFactory := database.NewFactory(UserGenerator).Override(userOverride)
userFactory.Save(db, 10)
// All generated records will have the same name: "Jérémy"
```

## Transactions

[`testutil.Session`](https://pkg.go.dev/goyave.dev/goyave/v5/util/testutil#Session) is an advanced mock for the `session.Session` interface powering the [transaction system](/advanced/transactions.html) used by services. This implementation is designed to provide a realistic, observable transaction system and help identify incorrect usage.

-  Each transaction created with this implementation has a cancellable context created from its parent. The context is canceled when the session is committed or rolled back. This helps detecting cases where your code tries to use a terminated transaction.
- A transaction cannot be committed or rolled back several times. It cannot be committed after being rolled back or the other way around.
- For nested transactions, all child sessions should be ended (committed or rolled back) before the parent can be ended. Moreover, the context given on `Begin()` should be the context or a child context of the parent session.
- A child session cannot be created or committed if its parent context is done.
- The root transaction cannot be committed or rolledback. This helps detecting cases where your codes uses the root session without creating a child session.

#### Example

Let's take an example in which we have a system that tracks user actions (user history) and we want a "register" history entry to be created when the user creates their account. The service method would be defined like so:

```go
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

Here, we want to check that:
- The operation was run inside a transaction.
- On success, the transaction was committed.
- On error, the transaction was rolled back.

After mocking our user and history repository, we can simply use `testutil.Session` to check the transactions that were created and their status at the end of the process. We are using [`testify`](https://github.com/stretchr/testify) for assertions in this example:
```go{10,18-21,26,33-36}
import (
	//...
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"goyave.dev/goyave/v5/util/testutil"
)

func TestCreateUser(t *testing.T) {
	// ...Setup the user and history repository mocks...
	session := testutil.NewTestSession()
	service := NewService(session, userRepoMock, historyRepoMock)

	createDTO := &dto.RegisterUser{/*...*/}
	createdUser, err := service.Create(context.Background(), createDTO)
	require.NoError(t, err)
	expected := &dto.User{/*...*/}
	assert.Equal(t, expected, createdUser)
	txs := session.Children()
	if assert.Len(t, txs, 1) {
		assert.Equal(t, testutil.SessionCommitted, txs[0].Status())
	}
	// ...Assert that the user and history were created in the repositories...

	t.Run("error", func(t *testing.T) {
		// ...Setup the user and history repository mocks...
		session := testutil.NewTestSession()
		service := NewService(session, userRepoMock, historyRepoMock)

		createDTO := &dto.RegisterUser{/*...*/}
		_, err := service.Create(context.Background(), createDTO)
		assert.ErrorIs(t, err, repo.err)

		txs := session.Children()
		if assert.Len(t, txs, 1) {
			assert.Equal(t, testutil.SessionRolledBack, txs[0].Status())
		}
	})
}
```
:::info Tip
When working with **nested transactions**, you can recursively check each transaction inside the `testutil.Session` returned by `session.Children()`:
```go
txs := session.Children()
if assert.Len(t, txs, 1) {
	assert.Equal(t, testutil.SessionCommitted, txs[0].Status())

	nested := txs[0].Children()
	//...
}
```
:::