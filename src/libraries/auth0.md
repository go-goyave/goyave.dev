---
title: "Auth0 authenticator"
description: "Auth0 authentication for Goyave."
---

# Auth0 authenticator

> A Goyave [Authenticator](https://goyave.dev/advanced/authentication.html) implementation for the [Auth0](https://auth0.com/) authentication and authorization service.

This library enables easy support for authenticating users with Auth0-issued JWT.

ℹ️ Once set up, your API expects an `Authentication: Bearer <access_token>` header on routes protected by this authenticator.

## Usage

```sh
go get -u goyave.dev/auth0@latest github.com/auth0/go-auth0/v3@latest github.com/auth0/go-jwt-middleware/v3@latest
```

### Configuration

Add the following section to your configuration:

```jsonc
{
    //...
    "auth": {
        "auth0": {
            "issuerDomains": [
                "dev-abcdefg.eu.auth0.com"
            ],
            "audiences": [
                "https://dev-abcdefg.eu.auth0.com/api/v2/"
            ],
            "cacheTTL": 300, // The number of seconds for the JWT cache refresh interval.
            "clientId": "xxxxxxxxxxxxxxxxx",
            "clientSecret": "xxxxxxxxxxxxxxxxx"
        }
    }
}
```

The authenticator supports mutiple issuers and/or audiences:
- the token must contain one of the issuers (`iss`) specified in `auth.auth0.issuerDomains`. Tokens without any matching issuer will be rejected.
- the token must contain at least one of the audiences (`aud`) specified in `auth.auth0.audiences`. Tokens without any matching audience will be rejected.

Then fill out the `auth0.Config` structure:
```go
import (
    "github.com/auth0/go-auth0/v3/management/option"
	"github.com/auth0/go-jwt-middleware/v3/jwks"
    "github.com/auth0/go-jwt-middleware/v3/validator"
	"goyave.dev/auth0"
)

config := server.Config()
auth0Cfg := &auth0.Config{
    ClientID:      config.GetString("auth.auth0.clientId"),
    ClientSecret:  config.GetString("auth.auth0.clientSecret"),
    IssuerDomains: config.GetStringSlice("auth.auth0.issuerDomains"),
    Audiences:     config.GetStringSlice("auth.auth0.audiences"),
    CacheTTL:      config.GetInt("auth.auth0.cacheTTL"),
    Algorithm:     validator.RS256,

    // Optional: validator, JWKS and Management client options
    ValidatorOptions:  []validator.Option{},
    JWKSOptions:       []jwks.MultiIssuerProviderOption{},
    ManagementOptions: []option.RequestOption{},
}
```

### Application-managed users

If your users are stored and managed in your application's database, you need to associate your database record with the Auth0 subject.

The `auth0.AppAuthenticator` handles most of it for you: after a token is validated, if no user can be found in the app database, it is assumed that it's the user's first successful login into your application. The authenticator then fetches the user's profile from the Auth0 database using the Management API and forwards it to your user service for creation. This approach is preferred over using a [post-registration trigger](https://auth0.com/docs/customize/actions/explore-triggers/post-user-registration) because it is more resilient to potential application failure and avoids delays before users can access your application.

#### Service

When using the `auth0.AppAuthenticator`, your user service must implement the `auth0.UserService[T any]` interface:

```go
func (s *Service) GetBySubject(ctx context.Context, subject string) (*dto.InternalUser, error) {
	user, err := s.Repository.GetBySubject(ctx, subject)
	if err != nil {
		return nil, errors.New(err)
	}
	return typeutil.MustConvert[*dto.InternalUser](user), nil
}

func (s *Service) CreateFromAuth0(ctx context.Context, userProfile *management.GetUserResponseContent) (*dto.InternalUser, error) {
	user := &model.User{
		Email:       typeutil.NewUndefined(*userProfile.Email),
		Username:    typeutil.NewUndefined(*userProfile.Nickname),
        //...
		Auth0UserID: *userProfile.UserID,
	}
	user, err := s.Repository.Create(ctx, user)
	if err != nil {
		return nil, errors.New(err)
	}
	return typeutil.MustConvert[*dto.InternalUser](user), nil
}
```

ℹ️ Don't forget to create a **unique** `auth0_user_id` column in your database schema. Treat the Auth0 user ID as an opaque **string**.

#### Authenticator setup

In your route registrer function:

```go
authenticator, err := auth0.NewAppAuthenticator[dto.InternalUser, auth0.NoCustomClaims](userService, auth0Cfg)
if err != nil {
    panic(err)
}
authMiddleware := auth.Middleware(authenticator)
router.GlobalMiddleware(authMiddleware)

// Register your routes.
// Don't forget the MetaAuth to require authentication on necessary routes!
router.Get("/users/profile", ctrl.ShowProfile).SetMeta(auth.MetaAuth, true)
```

By default, the `sub` JWT claim (from `validator.RegisteredClaims.Subject`) is forwarded to your service's `GetBySubject`. If you want to change this behavior and use another claim for identifying your user, use the authenticator's `SubjectFunc` option:

```go
authenticator.SubjectFunc = func(c *auth0.Claims[*auth0.NoCustomClaims]) string {
    return c.RegisteredClaims.ID
}
```

#### Retrieving the user in the controller handler

On successful authentication, your user will be available in `request.User` with the generic type you used for instanciating your authenticator (`*dto.InternalUser` in the previous example).

```go
func (ctrl *Controller) ShowProfile(response *goyave.Response, request *goyave.Request) {
    user := request.User.(*dto.InternaleUser) // Safe
	userDTO := typeutil.MustConvert[*dto.User](user)
	response.JSON(http.StatusOK, userDTO)
}
```

### Auth0-managed users

If you want to delegate user management entirely to Auth0 and source your users from the Auth0 Management API, use `auth0.Authenticator`:

```go
authenticator, err := auth0.NewAuthenticator[auth0.NoCustomClaims](auth0Cfg)
if err != nil {
    panic(err)
}
authMiddleware := auth.Middleware(authenticator)
router.GlobalMiddleware(authMiddleware)

// Register your routes.
// Don't forget the MetaAuth to require authentication on necessary routes!
router.Get("/users/profile", ctrl.ShowProfile).SetMeta(auth.MetaAuth, true)
```

#### Retrieving the user in the controller handler

On successful authentication, your user will be available in `request.User` with the `*management.GetUserResponseContent` type:

```go
import "github.com/auth0/go-auth0/v3/management"

func (ctrl *Controller) ShowProfile(response *goyave.Response, request *goyave.Request) {
    user := request.User.(*management.GetUserResponseContent)
	response.JSON(http.StatusOK, user)
}
```

### Claims

#### Custom claims

If you don't need custom claims and the standard registered claims are sufficient for your needs, use `auth0.NoCustomClaims`, which is a simple empty struct. On the other hand, if you want to use custom claims, your custom claims structure must implement `validator.CustomClaims`:

```go
type MyCustomClaims struct {
	CustomField string `json:"custom_field"`
}

func (c *MyCustomClaims) Validate(_ context.Context) error { // Pointer receiver is important!
	if c.CustomField == "" {
		return fmt.Errorf("custom field is required")
	}
	return nil
}
```

Then use it when instantiating the authenticator:

```go
authenticator, err := auth0.NewAppAuthenticator[dto.InternalUser, MyCustomClaims](userService, auth0Cfg)
// Or
authenticator, err := auth0.NewAuthenticator[MyCustomClaims](auth0Cfg)
```

#### Using claims

On successful authentication, claims are made available in request's extras with the `auth0.ExtraAuth0Claims` key. The claims type corresponds to a pointer to the generic type given at the authenticator's instantiation:
```go
func (ctrl *Controller) ShowProfile(response *goyave.Response, request *goyave.Request) {
    claims := request.Extra[auth0.ExtraAuth0Claims{}].(*auth0.Claims[*MyCustomClaims])
    // claims.RegisteredClaims.Subject
    // claims.CustomClaims.CustomField
    //...
}
```

## Limitations

- This implementation currently doesn't support DPoP.
- When managing your users within your application, user and metadata updates are not automatic. You need to create an [event stream](https://auth0.com/docs/customize/events) to notify your API of the changes. Exact flow and implementation will differ depending on your systems. Support for updates is out of scope for this library.