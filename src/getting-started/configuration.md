---
title: "Configuration"
description: "Goyave provides a flexible structured configuration system that works with files but also supports environment variables."
---

# Configuration

[[toc]]

## Introduction

Goyave provides a flexible structured configuration system that works with files but also supports environment variables. Most of the framework's core is configurable. Any other package can register their own configuration entries as well.

To configure your application, use the `config.json` file at your project's root. If the configuration file is missing some entries, the default values will be used. See the [configuration reference](#configuration-reference) below to know more.

:::warning
Configuration can be changed temporarily at runtime, but the operation is **not concurrently safe**. It is therefore advised to not use [`Config.Set()`](https://pkg.go.dev/goyave.dev/goyave/v5/config#Config.Set) outside of tests.

Changing configuration at runtime is a rare use-case, so the decision was made to keep better performance gained from not needing synchronization.
:::

## Terminology

**Entry**: a configuration entry is a value accessible using a key. The keys have a dot-separated format. (e.g.: `app.name`)

**Registering an entry**: informs the framework that an entry with the given key is expected. Registering an entry allows to set a default value to be used if this entry is not provided in an app's configuration file, to enforce a certain type for this entry (for example if it needs to be an integer), and to set a list of allowed values.

**Category**: a category is represented by a JSON object in your configuration file, delimited by braces. Sub-categories are categories that are not at root level. For example: `server.proxy` is a sub-category of the `server` category.

## Loading configuration

### Automatic

By default, the configuration is loaded automatically when initializing the server with `goyave.New()`. 

Most projects need different configuration values based on the environment. For example, you won't connect to the same database if you're in local development, in a testing environment inside continuous integration pipelines, or in production. Goyave supports multiple configurations. If you are using `config.Load()` or the automatic loader, the framework will pick the appropriate file depending on the environment variable `GOYAVE_ENV`.

| GOYAVE_ENV                    | Config file              |
|-------------------------------|--------------------------|
| test                          | `config.test.json`       |
| production                    | `config.production.json` |
| *custom_env*                  | `config.custom_env.json` |
| local / localhost / *not set* | `config.json`            |

If you want to load the config yourself using the same logic, you can do so using `config.Load()`:
```go
import (
	"fmt"
	"os"

	"goyave.dev/goyave/v5/config"
	"goyave.dev/goyave/v5/util/errors"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}

	//...
}
```

### From a file

You can load a config file using its absolute path, or path relative to your working directory.

```go
import (
	"fmt"
	"os"

	"goyave.dev/goyave/v5/config"
	"goyave.dev/goyave/v5/util/errors"
)

func main() {
	cfg, err := config.LoadFrom("config.json")
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}

	//...
}
```


### From JSON or embed

You also have the option of loading your configuration from a raw JSON string or an [embed](https://pkg.go.dev/embed).

```go
import (
	_ "embed"
	"fmt"
	"os"

	"goyave.dev/goyave/v5/config"
	"goyave.dev/goyave/v5/util/errors"
)

//go:embed config.json
var cfgJSON string

func main() {
	cfg, err := config.LoadJSON(cfgJSON)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}

	//...
}
```

## Validation

All entries are **validated**. That means that the application will not start if you provided an invalid value in your config (for example if the specified port is not a number). 

Each entries is registered with a default value, a type and authorized values. Raw values parsed from JSON may be converted to the expected type if the value allows it. For example, a number parsed in JSON is always `float64` by default, but if the entry specifies that the type is `int`, the configuration loader will try to convert the number to `int`. If the entry is specified to be a slice, it will be converted to a slice of the expected type instead of always ending up `[]any`.

## Environment variables

You can use environment variables in your configuration file. Environment variables are identified by the following syntax: `${VARIABLE_NAME}`.

```json
{
    "database": {
        "host": "${DB_HOST}"
    }
}
```

**Note**: *This syntax is strict. If the string doesn't start with `${` or doesn't end with `}`, it will not be considered an environment variable. Therefore, templating like `${VAR_1}-${VAR_2}` is __not__ supported.*

`string`, `int`, `float64` and `bool` values are supported. If the configuration entry is expected to be of one of these types, the content of the environment variable will be automatically converted as explained in the validation section above. If the conversion fails, a configuration loading error will be returned.

If an environment variable mentioned in a configuration file is not set, the configuration validation will not pass. Environment variables are not supported inside slices.

## Using the configuration

All entries are accessible using **dot-separated paths**. For example If you want to access the `name` entry in the app category, the key will be `app.name`. You **cannot** retrieve an entire category at once.

```go
cfg.Get("app.name") // type any
cfg.GetString("app.name")
cfg.GetBool("app.debug")
cfg.GetInt("server.port")
cfg.GetFloat("server.maxUploadSize")
cfg.GetStringSlice("path.to.slice")
cfg.GetBoolSlice("path.to.slice")
cfg.GetIntSlice("path.to.slice")
cfg.GetFloatSlice("path.to.slice")
cfg.Has("custom_entry") // Returns true if the entry exists
```

If the entry requested is not of the getter's expected type, the function will panic.

See the [reference](https://pkg.go.dev/goyave.dev/goyave/v5/config#Config).

## Configuration reference

### App

| Entry               | Type     | Default       | Note                                                                                                                                                       |
|---------------------|----------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| app.name            | `string` | `"goyave"`    |                                                                                                                                                            |
| app.environment     | `string` | `"localhost"` |                                                                                                                                                            |
| app.debug           | `bool`   | `true`        | When activated, uses human-readable log formatter instead of JSON structured logs and sends error(s) details in responses. **Disable this in production!** |
| app.defaultLanguage | `string` | `"en-US"`     | See the [Localization](/advanced/localization.html) section                                                                                                |

### Server


| Entry                        | Type      | Default       | Note                                                        |
|------------------------------|-----------|---------------|-------------------------------------------------------------|
| server.host                  | `string`  | `"127.0.0.1"` |                                                             |
| server.domain                | `string`  | `""`          | Used for URL generation. Leave empty to use IP instead.     |
| server.port                  | `int`     | `8080`        |                                                             |
| server.writeTimeout          | `int`     | `10`          | `*http.Server`'s `WriteTimeout` (in seconds)                |
| server.readTimeout           | `int`     | `10`          | `*http.Server`'s `ReadTimeout` (in seconds)                 |
| server.readHeaderTimeout     | `int`     | `10`          | `*http.Server`'s `ReadHeaderTimeout` (in seconds)           |
| server.idleTimeout           | `int`     | `20`          | `*http.Server`'s `IdleTimeout` (in seconds)                 |
| server.websocketCloseTimeout | `int`     | `10`          | Maximum time for the websocket close handshake (in seconds) |
| server.maxUploadSize         | `float64` | `10`          | Maximum size of the request, in MiB                         |

### Proxy

This section is used for URL generation ([`server.ProxyBaseURL()`](https://pkg.go.dev/goyave.dev/goyave/v5#Server.ProxyBaseURL)) if you are running your application behind a reverse proxy (such as nginx or apache). **These entries don't have any impact on networking and are not required.**

| Entry                 | Type     | Accepted values     | Default  | Note                                    |
|-----------------------|----------|---------------------|----------|-----------------------------------------|
| server.proxy.protocol | `string` | `"http"`, `"https"` | `"http"` |                                         |
| server.proxy.host     | `string` | any                 |          | Public host or domain of your proxy     |
| server.proxy.port     | `int`    | any                 | `80`     |                                         |
| server.proxy.base     | `string` | any                 | `""`     | The base path (usually starts with `/`) |

### Database

| Entry                             | Type     | Default       | Note                                                        |
|-----------------------------------|----------|---------------|-------------------------------------------------------------|
| database.connection               | `string` | `"none"`      | See the [database](/basics/database.html) guide             |
| database.host                     | `string` | `"127.0.0.1"` |                                                             |
| database.port                     | `int`    | `0`           |                                                             |
| database.name                     | `string` | `""`          |                                                             |
| database.username                 | `string` | `""`          |                                                             |
| database.password                 | `string` | `""`          |                                                             |
| database.options                  | `string` | `""`          | The options passed to the DSN when creating the connection. |
| database.maxOpenConnections       | `int`    | `20`          |                                                             |
| database.maxIdleConnections       | `int`    | `20`          |                                                             |
| database.maxLifetime              | `int`    | `300`         | The maximum time (in seconds) a connection may be reused.   |
| database.defaultReadQueryTimeout  | `int`    | `20000`       | The maximum execution time for read queries (in ms)         |
| database.defaultWriteQueryTimeout | `int`    | `40000`       | The maximum execution time for write queries (in ms)        |

### GORM config

| Entry                                                    | Type   | Default |
|----------------------------------------------------------|--------|---------|
| database.config.skipDefaultTransaction                   | `bool` | `false` |
| database.config.dryRun                                   | `bool` | `false` |
| database.config.prepareStmt                              | `bool` | `true`  |
| database.config.disableNestedTransaction                 | `bool` | `false` |
| database.config.allowGlobalUpdate                        | `bool` | `false` |
| database.config.disableAutomaticPing                     | `bool` | `false` |
| database.config.disableForeignKeyConstraintWhenMigrating | `bool` | `false` |

::: tip
See [GORM's documentation](https://gorm.io/docs/gorm_config.html) for more details.
:::

## Custom configuration entries

Configuration can be expanded. It is very likely that a plugin or a package you're developing is using some form of options. These options can be added to the configuration system so it is not needed to set them in the code or to make some wiring.

You can register a new config entry and its validation using `config.Register()`.

Each module should register its config entries in an `init()` function, even if they don't have a default value, in order to ensure they will be validated.
Each module should use its own category and use a name both expressive and unique to avoid collisions.
For example, the `auth` package registers, among others, `auth.basic.username` and `auth.jwt.expiry`, thus creating a category for its package, and two subcategories for its features.

To register an entry without a default value (only specify how it will be validated), set `Entry.Value` to `nil`.

Panics if an entry already exists for this key and is not identical to the one passed as parameter of this function. On the other hand, if the entries are identical, no conflict is expected so the configuration is left in its current state.

```go
import (
	"reflect"

	"goyave.dev/goyave/v5/config"
)

func init() {
	config.Register("customCategory.customEntry", config.Entry{
		Value:            "default value",
		Type:             reflect.String,
		IsSlice:          false,
		AuthorizedValues: []any{},
	})
}
```