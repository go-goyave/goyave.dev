---
title: "Authentication"
description: "Goyave provides a convenient and expandable basis for handling authentication in your application and supports basic and JWT authentication out of the box."
---

# Authentication

[[toc]]

## Introduction

Goyave provides a convenient and expandable basis for handling authentication in your application with the `goyave.dev/goyave/v5/auth` package.

Authentication can be enabled when registering your routes by adding the **authentication middleware** and adding the `auth.MetaAuth` meta to the router or routes that require authentication.

The authentication middleware uses an **authenticator**. An **authenticator** is a **component** that implements the method `Authenticate(request *goyave.Request) (*T, error)`. This method is responsible of retrieving the credentials in the given request (usually in the `Authorization` header), check them and return a DTO of the authenticated user, If the authentication failed, it returs a localized error message explaining why authentication failed.

Authenticators therefore depend on a **service** that allow them to retrieve the user information from the database. This service must implement `auth.UserService[T]`, which defines a method `FindByUsername(ctx context.Context, username any) (*T, error)`. Note that the "username" can be anything provided it can identify a user: an ID, an email, a unique username.

On successful authentication, the auth **middleware** automatically sets the `request.User` field to the value returned by the **authenticator**. The user is also injected into the request's context and can be retrieved using `auth.UserFromContext()`.

Otherwise `401 Unauthorized` is returned with the localized message mentioned previously:
`{"error": "authentication error reason"}`

The following example applies basic authentication of users using the `Password` field in the `dto.InternalUser`:
```go
import (
	"goyave.dev/goyave/v5/auth"
	"my-project/dto"
	"my-project/service"
	//...
)

userService := server.Service(service.User).(auth.UserService[dto.InternalUser])
authMiddleware := auth.Middleware(auth.NewBasicAuthenticator(userService, "Password"))
router.GlobalMiddleware(authMiddleware).SetMeta(auth.MetaAuth, true)
```

:::info
- If the `auth.MetaAuth` is missing or not equal to `true`, the authentication middleware is **skipped**. In route groups that have authentication enabled, you can disable authentication on specific routes or subrouters by setting the `auth.MetaAuth` to `false`. You can use the authentication middleware as a global middleware.
- Note that we used `dto.InternalUser` here as user type. It is recommended to use a DTO different from the user DTO sent to clients in responses to have better control over the exposed information.
- The "not found" and "method not allowed" routes are **never** authenticated, even if the middleware is global. This is because these routes don't have a parent router, meaning meta cannot be applied to them.
:::

When a user is successfully authenticated on a protected route, its information is available in the following handlers in the stack through the request's `User` field.
```go
func (ctrl *Controller) ShowProfile(response *goyave.Response, request *goyave.Request) {
	user := request.User.(*dto.InternalUser)
	response.JSON(http.StatusOK, typeutil.MustConvert[*dto.User](user))
}
```

## User service

Here is an example of service implementation of `auth.UserService[dto.InternaleUser]`:

```go
// service/user/user.go
func (s *Service) FindByUsername(ctx context.Context, username any) (*dto.InternalUser, error) {
	u, err := s.repository.FindByUsername(ctx, fmt.Sprintf("%v", username))
	return typeutil.MustConvert[*dto.InternalUser](u), errors.New(err)
}
```
```go
// database/repository/user.go
func (r *User) FindByUsername(ctx context.Context, email string) (*model.User, error) {
	var user *model.User
	db := session.DB(ctx, r.DB).Where("email", email).First(&user)
	return user, errors.New(db.Error)
}
```

:::tip
`FindByUsername` receives `any` as username. Make sure to check it or convert it a needed from inside your service so it can be used safely in the repository.
:::

## Basic auth

[Basic authentication](https://en.wikipedia.org/wiki/Basic_access_authentication) is an authentication method using the `Authorization` header and a simple username and password combination with the following format: `username:password`, encoded in base64. There are two built-in Authenticators for Basic auth: one using the database as a user providers, and one using configuration.

### Database provider

This authenticator fetches the user information from the database. The password is then retrieved from the value of a field in the DTO returned by the service. This field is identified by its name, given in the `auth.NewBasicAuthenticator(userService, passwordFieldName)` constructor.

The password given in the request is compared with the hashed password stored in the database using [`bcrypt`](https://pkg.go.dev/golang.org/x/crypto/bcrypt).

```go
userService := server.Service(service.User).(auth.UserService[dto.InternalUser])
authMiddleware := auth.Middleware(auth.NewBasicAuthenticator(userService, "Password"))
```
```go
// dto/user.go
type InternalUser struct {
	User
	Password string `json:"password"` // This field's value will be used to check the password
}
```

This provider supports the `Optional` flag, which defines if the authenticator allows requests that don't provide credentials. Handlers should therefore check if `request.User` is not `nil` before accessing it.

```go
authenticator := auth.NewBasicAuthenticator(userService, "Password")
authenticator.Optional = true
```

### Config provider

This authenticator fetches the user information from the config. This method is good for quick proof-of-concepts, as it requires minimum setup, but shouldn't be used in real-world applications.

- The `auth.basic.username` config entry defines the username that must be matched.
- The `auth.basic.password` config entry defines the password that must be matched.

To apply this protection to your routes, start by adding the `auth` category at the root of your configuration, and the `auth.basic` sub-category:

```json
{
  //...
  "auth": {
    "basic": {
      "username": "admin",
      "password": "admin"
    }
  }
}
```
Then, add the config basic auth middlewere:
```go
router.GlobalMiddleware(auth.ConfigBasicAuth()).SetMeta(auth.MetaAuth, true)
// or
authMiddleware := auth.Middleware(&auth.ConfigBasicAuthenticator{})
router.GlobalMiddleware(authMiddleware).SetMeta(auth.MetaAuth, true)
```

The DTO used for this authenticator is `*auth.BasicUser`:
``` go
type BasicUser struct {
	Name string
}
```

You can test the authentication by requesting a route protected by basic authentication like so:
```sh
$ curl -u username:password http://localhost:8080/hello
``` 

## JSON Web Token (JWT)

JWT, or [JSON Web Token](https://en.wikipedia.org/wiki/JSON_Web_Token), is an open standard of authentication that defines a compact and self-contained way for securely transmitting information between parties as a JSON object. This information can be verified and trusted because it is digitally signed. JWTs can be signed using a secret (with the HMAC algorithm) or a public/private key pair using RSA or ECDSA. Out of the box, Goyave supports HMAC, RSA (without key password) and ECDSA. RSA and ECDSA require **PEM-encoded** keys. Goyave uses the [golang-jwt/jwt](https://github.com/golang-jwt/jwt) library in the background.

JWT Authentication comes with the `auth.jwt.expiry` configuration entry, which defines the number of seconds a token is valid for and defaults to `300` (5 minutes).

### JWT Service

`auth.JWTService` is a built-in service managing signing keys and allowing JWT generation. It supports token generation using the following signing methods:
- **HMAC**: using the secret defined in configuration `auth.jwt.secret`.
- **RSA**: using the key pair defined in configuration `auth.jwt.rsa.private` and `auth.jwt.rsa.public`. The values represent a path to the file containing the key in the service's file system. The key must be **PEM-encoded**.
- **ECDSA**: using the key pair defined in configuration `auth.jwt.ecdsa.private` and `auth.jwt.ecdsa.public`. The values represent a path to the file containing the key in the service's file system. The key must be **PEM-encoded**.

:::info
The keys are loaded and parsed once, then cached for better performance. 
:::

::: warning
Make sure your HMAC secret is securely generated and is long enough:
- HMAC-SHA256: the secret must be 256+ bits long
- HMAC-SHA384: the secret must be 384+ bits long
- HMAC-SHA512: the secret must be 512+ bits long
:::

If the service has not been registered yet when the built-in `JWTAuthenticator` or the `JWTController` are initialized. It will be **registered automatically** using the `osfs.FS` file system. If you want to use another file system for your keys storage, you can initialize and register the service manually:
```go
jwtService := auth.NewJWTService(server.Config(), filesystem)
server.RegisterService(jwtService)
```

#### Generating tokens

Use the `auth.JWTService`'s `GenerateToken()` or `GenerateTokenWithClaims()` to generate a new JWT.

`GenerateToken` generate a new JWT with default settings:
- The token is created using the HMAC SHA256 method and signed using the `auth.jwt.secret` config entry.
- The token is set to expire in the amount of seconds defined by the `auth.jwt.expiry` config entry.
- The generated token will contain the following claims:
   - `sub`: has the value of the `id` parameter.
   - `nbf`: "Not before", the current timestamp is used.
   - `exp`: "Expiry", the current timestamp plus the `auth.jwt.expiry` config entry.
- The token is returned as a `string`.

```go
token, err := jwtService.GenerateToken("johndoe@example.org")
```

---

`GenerateTokenWithClaims` lets you add custom claims and use another signing method:
- The token is set to expire in the amount of seconds defined by the `auth.jwt.expiry` config entry.
- Depending on the given signing method, the following configuration entries will be used:
   - RSA: `auth.jwt.rsa.private`: path to the private PEM-encoded RSA key.
   - ECDSA: `auth.jwt.ecdsa.private`: path to the private PEM-encoded ECDSA key.
   - HMAC: `auth.jwt.secret`: HMAC secret
- The generated token will also contain the following claims:
   - `nbf`: "Not before", the current timestamp is used
   - `exp`: "Expiry", the current timestamp plus the `auth.jwt.expiry` config entry.
- `nbf` and `exp` can be overridden if they are set in the `claims` parameter.

```go
claims := jwt.MapClaims{
	"sub": "johndoe@example.org",
}
jwtAsString, err := jwtService.GenerateTokenWithClaims(claims, jwt.SigningMethodES256)
```


### JWT Authenticator

```go
authenticator := auth.NewJWTAuthenticator(userService)
authMiddleware := auth.Middleware(authenticator)
router.GlobalMiddleware(authMiddleware).SetMeta(auth.MetaAuth, true)
```

Routes protected by this authenticator will have to contain the following header:
```http
Authorization: Bearer <YOUR_TOKEN>
```

- This provider supports the `Optional` flag, which defines if the authenticator allows requests that don't provide credentials. Handlers should therefore check if `request.User` is not `nil` before accessing it.
- You can define a custom ID claim name with the `ClaimName` option. By default, the `sub` claim is used to retrieve the username sent to the user service.
- You can define the desired signing method with `SigningMethod`.

```go
import (
	"github.com/golang-jwt/jwt"
	"goyave.dev/goyave/v5/auth"
	//...
)

authenticator := auth.NewJWTAuthenticator(userService)
authenticator.Optional = true
authenticator.ClaimName = "userid"
authenticator.SigningMethod = jwt.SigningMethodES256
```

If a token is valid (even if authentication fails), its claims are put into `request.Extra` with the `auth.ExtraJWTClaims` key, so you can access them in any subsequent handler:

```go
import (
	"github.com/golang-jwt/jwt"
	"goyave.dev/goyave/v5/auth"
	//...
)

func (ctrl *Controller) Handler(response *goyave.Response, request *goyave.Request) {
	claims := request.Extra[auth.ExtraJWTClaims{}].(jwt.MapClaims)
	//...
}
```

#### RSA

If you expect tokens to be signed with RSA, you will need to add the `auth.jwt.rsa.public` configuration entry. This entry defines the path to the **PEM-encoded** RSA public key file in the JWT service's file system. Then, specify the expected signature method in the `SigningMethod` field of `auth.JWTAuthenticator`.


::: tip
You can find the list of available methods in the [jwt-go documentation](https://pkg.go.dev/github.com/golang-jwt/jwt#SigningMethodRSA).
- For testing purposes, you can generate an RSA key-pair using OpenSSL:
```sh
openssl genrsa -out rsa-private.pem 2048
openssl rsa -in rsa-private.pem -outform PEM -pubout -out rsa-public.pem
```
:::

#### ECDSA

If you expect tokens to be signed with ECDSA, you will need to add the `auth.jwt.ecdsa.public` configuration entry. This entry defines the path to the **PEM-encoded** ECDSA public key file in the JWT service's file system. Then, specify the expected signature method in the `SigningMethod` field of `auth.JWTAuthenticator`.

::: tip
- You can find the list of available methods in the [jwt-go documentation](https://pkg.go.dev/github.com/golang-jwt/jwt#SigningMethodECDSA).
- For testing purposes, you can generate an ECDSA key-pair using OpenSSL:
```sh
openssl ecparam -name prime256v1 -genkey -noout -out ecdsa-private.key
openssl pkcs8 -topk8 -in ecdsa-private.key -out ecdsa-private.pem
openssl ec -in ecdsa-private.pem -pubout -out ecdsa-public.pem
```
:::

### Login controller

`auth.JWTController` is a simple controller adding a login route for JWT password grant. Similarly to the basic authenticator, it uses the password retrieved from the value of a field in the DTO returned by the service. The password given in the request is compared with the hashed password stored in the database using **bcrypt**. This controller implements `goyave.Registrer` so its routes will automatically be registered when using it with `router.Controller()`.

```go
userService := server.Service(service.User).(auth.UserService[dto.InternalUser])
router.Controller(auth.NewJWTController(userService, "Password"))
```
```go
// dto/user.go
type InternalUser struct {
	User
	Password string `json:"password"` // This field's value will be used to check the password
}
```


The controller has a route `POST /login` with validation. By default, the controller will use the "username" and "password" fields from incoming requests for the authentication process. This can be changed by modifying the controller's `UsernameField` and `PasswordField` fields:

```go
jwtController := auth.NewJWTController(userService, "Password")
jwtController.UsernameField = "email"
jwtController.PasswordField = "pwd"
```
:::info
Changing the username and password fields will also change the validation automatically.
:::

On successful authentication, a response containing the token will be returned:
```json
{
	"token": "eyJhbGc..."
}
```

If the authentication fails, a response with a localized error message (`auth.invalid-credentials`) and status code `401 Unauthorized` is returned. 

#### Signing method

As `JWTController` generates token for you, you can also customize the signing method it uses. By default, HMAC-SHA256 is used. You can override this by changing the `SigningMethod` field:

```go
import "github.com/golang-jwt/jwt"

//...

jwtController := auth.NewJWTController(userService, "Password")
jwtController.SigningMethod = jwt.SigningMethodES256
```

#### Custom token generation

You can also override the token generation logic executed by the controller on successful authentication by setting the `TokenFunc` field:

```go
jwtController := auth.NewJWTController(userService, "Password")
jwtController.TokenFunc = func(_ *goyave.Request, user *dto.InternalUser) (string, error) {
	jwtService := server.Service(auth.JWTServiceName).(*auth.JWTService)
	return jwtService.GenerateTokenWithClaims(jwt.MapClaims{
		"sub":  user.ID,
		"name": user.Name,
	}, jwt.SigningMethodHS256)
}
```

::: tip
`auth.TokenFunc[T]` is an alias for `func(request *goyave.Request, user *T) (string, error)`
:::

## Custom authenticator

If none of the built-in authentication method suits your needs, you can easily implement a new one and plug it right into the authentication middleware.

The typical `auth.Authenticator` takes a **generic parameter** `T`, representing the user DTO returned by the user service.

In the following example, we are going to authenticate the user using a simple token stored in the database:

```go
// http/auth/custom.go
package auth

import (
	"context"
	"fmt"

	stderrors "errors"

	"gorm.io/gorm"
	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/util/errors"
)

type UserService[T any] interface {
	FindUserByToken(ctx context.Context, token string) (*T, error)
}

type CustomAuthenticator[T any] struct {
	goyave.Component

	UserService UserService[T]
}

func (a *CustomAuthenticator[T]) Authenticate(request *goyave.Request) (*T, error) {
	token, ok := request.BearerToken()

	if !ok {
		return nil, fmt.Errorf(request.Lang.Get("auth.no-credentials-provided"))
	}

	user, err := a.UserService.FindUserByToken(request.Context(), token)
	if err != nil {
		if stderrors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf(request.Lang.Get("auth.invalid-credentials"))
		}
		panic(errors.New(err))
	}

	return user, nil
}
```

:::info
It is not necessary to **wrap** errors returned by an authenticator, as they are used only for writing the response to the client. If an error (for example a DB error) happens, you can `panic` with a wrapped error.
:::

The `auth.Unauthorizer` interface lets authenticators define a custom behavior when the authentication fails. This is useful if you want to customize the response sent to the client.

```go
func (a *CustomAuthenticator[T]) OnUnauthorized(response *goyave.Response, request *goyave.Request, err error) {
	response.JSON(http.StatusUnauthorized, map[string]string{"authError": err.Error()})
}
```