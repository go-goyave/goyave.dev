---
title: "Database"
description: "Goyave is built with relational databases in mind, and use the awesome Gorm ORM."
---

# Database

[[toc]]

## Introduction

Goyave is built with relational databases in mind, and use the awesome [Gorm ORM](https://gorm.io/).

Database connections are managed by the framework and are long-lived. When the server shuts down, the database connections are closed automatically. So you don't have to worry about creating, closing or refreshing database connections in your application.

The database connection pool will be available right after the server is created with `goyave.New()`, and can be accessed with `server.DB()`. The pool is spread to all **components** as well.

## Configuration

Very few code is required to get started with databases. There are some [configuration](../configuration.html#database-category) options that you need to change though:
- `database.connection`
- `database.host`
- `database.port`
- `database.name`
- `database.username`
- `database.password`
- `database.options`

::: tip
`database.options` represents the additional connection options in the DSN. For example, when using MySQL, you should use the `parseTime=true` option so `time.Time` can be handled correctly. Available options differ from one driver to another and can be found in their respective documentation.

This entry can be empty.
:::

### DSN Options

This section gives an example of the value for the `database.options` configuration entry for each supported driver.

#### MySQL

```
charset=utf8mb4&collation=utf8mb4_general_ci&parseTime=true&loc=Local
```

Find more information about the MySQL options [here](https://github.com/go-sql-driver/mysql#parameters).

#### PostgreSQL

```
sslmode=disable application_name=goyave
```

Find more information about the PostgreSQL options [here](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS).

#### SQLite

```
cache=shared&mode=memory
```

Find more information about the SQLite options [here](https://github.com/mattn/go-sqlite3#connection-string).

#### MSSQL

```
encrypt=disable
```

Find more information about the MSSQL options [here](https://github.com/denisenkom/go-mssqldb#connection-parameters-and-dsn).

### Drivers

The framework supports the following sql drivers out-of-the-box, defined in the `database.connection` configuration entry:
- `none` (*Disable database features*)
- `mysql`
- `postgres`
- `sqlite3`
- `mssql`

In order to be able connect to the database, Gorm needs a database driver to be imported. Add the following import to your `main.go`:

```go
import _ "goyave.dev/goyave/v5/database/dialect/mysql"
import _ "goyave.dev/goyave/v5/database/dialect/postgres"
import _ "goyave.dev/goyave/v5/database/dialect/sqlite"
import _ "goyave.dev/goyave/v5/database/dialect/mssql"
```

:::info
- Comment or remove the imports you don't need. 
- For SQLite, only the `database.name` config entry is required.
:::

---

You can **register more dialects** for Gorm. Start by implementing or importing it, then tell Goyave how to build the connection string for this dialect:

```go
import (
  "goyave.dev/goyave/v5/database"
  "my-project/database/mydriver"
)

func init() {
  database.RegisterDialect("my-driver", "{username}:{password}@({host}:{port})/{name}?{options}", mydriver.Open)
}
```

::: tip
See the [Gorm "Write driver" documentation](https://gorm.io/docs/write_driver.html).
:::

Template format accepts the following placeholders, which will be replaced with the corresponding configuration entries automatically:
- `{username}`
- `{password}`
- `{host}`
- `{port}`
- `{name}`
- `{options}`

You cannot override a dialect that already exists.

## Timeout

By default, a timeout plugin is registered. It will use `database.defaultReadQueryTimeout` and `database.defaultWriteQueryTimeout` (time in ms) to automatically add a timeout to the query's context. The timeout is scoped to a full Gorm operation: the timeout is started in a [callback](https://gorm.io/docs/write_plugins.html#Callbacks) executed first (`Before("*")`). This means that hooks such as `BeforeCreate`, `AfterSave` and such are counted in the execution time. When using transactions, the timeout is **per operation**, and not for the entire transaction to complete.

If the query's context already has a context with a deadline or a timeout, the plugin won't override it.

You can disable either the read or write timeout (or both) by setting them to `0`.

:::danger
The `Raw().Scan()` operation is not supported by the timeout plugin because the plugin would cancel the context before Gorm's internal call to `rows.Next()`, causing an error. This cannot be worked around in the plugin due to how Gorm is written.

If you want to use a timeout for these operations, you will have to do it manually:

```go
users := []*model.User{}

ctx, cancel := context.WithTimeout(ctx, time.Millisecond*500)
defer cancel()
db := r.DB.WithContext(ctx).Raw("SELECT * FROM users").Scan(&users)
```

**`Exec()` operations ARE supported by the timeout plugin.** 
:::

## Pagination

`database.Paginator` is a tool that helps you paginate records. This structure contains pagination information (current page, maximum page, total number of records), which is automatically fetched.

**Example**:

```go
// database/repository/user.go
package repository

import (
	"context"

	"gorm.io/gorm"
	"goyave.dev/goyave/v5/database"
	"my-project/database/model"
)

type User struct {
	DB *gorm.DB
}

func (r *User) Paginate(ctx context.Context, page int, pageSize int) (*database.Paginator[*model.User], error) {
	users := []*model.User{}

	paginator := database.NewPaginator(r.DB, page, pageSize, &users)
	err := paginator.Find()
	return paginator, err
}
```

When calling `paginator.Find()`, two queries are executed inside a **transaction**:
- the page info (total records and max pages) is fetched and the structure's fields are updated automatically.
- the actual query with the records. The destination slice passed to `NewPaginator()` is also updated automatically. 

:::warning
Don"t forget to convert your paginator's records to a DTO before returning it from your service. A paginator can be easily converted using `typeutil.MustConvert()`:
```go
import (
	"context"

	"goyave.dev/goyave/v5/database"
	"goyave.dev/goyave/v5/util/typeutil"
	"my-project/dto"
)
//...
paginator, err := repository.Paginate(ctx, page, pageSize)
if err != nil {
	return nil, err
}
// paginator is of type `*database.Paginator[*model.User]` before conversion
return typeutil.MustConvert[*database.PaginatorDTO[*dto.User]](paginator), nil
```
:::

---

You can add clauses to your SQL query before creating the paginator. This is especially useful if you want to paginate search results. The condition will be applied to both the total records count query and the actual query.

**Full example:**
```go
import (
	"context"

	"goyave.dev/goyave/v5/database"
	"goyave.dev/goyave/v5/util/sqlutil"
	"my-project/database/model"
)

func (r *User) Paginate(ctx context.Context, page int, pageSize int, search string) (*database.Paginator[*model.User], error) {
	users := []*model.User{}

	db := r.DB
	if search != "" {
		db = db.Where("email", "%"+sqlutil.EscapeLike(search)+"%")
	}

	paginator := database.NewPaginator(db, page, pageSize, &users)
	err := paginator.Find()
	return paginator, err
}
```

:::tip
Check out the [filter library](/libraries/filter.html) for powerful  dynamic filtering and pagination based on query params.
:::

### Paginating raw queries

For special use-cases, you may want to paginate results from a raw query instead of using the automatically generated one. The raw query should not contain the `LIMIT` and `OFFSET` clauses, as they will be added automatically at the end, based on the given `page` and `pageSize`.

The count query should return a single number (`COUNT(*)` for example).

```go
func (r *User) Paginate(ctx context.Context, page int, pageSize int) (*database.Paginator[*model.User], error) {
	users := []*model.User{}

	paginator := database.NewPaginator(r.DB, page, pageSize, &users)
	paginator.Raw(
		"SELECT * FROM users WHERE id = ?",
		[]any{123}, // args for the raw query
		"SELECT COUNT(*) FROM users WHERE id = ?",
		[]any{123}, // args for the raw count query
	)
	err := paginator.Find()
	return paginator, err
}
```

:::warning
If you are using raw pagination, a `Scan()` operation is executed. Therefore, the **timeout** plugin won't work. If you want these queries to have a timeout, make sure to give the paginator a database with a context having a timeout:
```go
ctx, cancel := context.WithTimeout(ctx, time.Millisecond*500)
defer cancel()
db := r.DB.WithContext(ctx)
paginator := database.NewPaginator(db, page, pageSize, &users)
```
:::

## Setting up SSL/TLS

### MySQL

If you want to make your database connection use a TLS configuration, create `database/tls.go`. In this file, create an `init()` function which will load your certificates and keys.

Don't forget to blank import the database package in your `main.go`: `import _ "myproject/database"`. Finally, for a configuration named "custom", add `&tls=custom` at the end of the `database.options` configuration entry.

```go
package database

import (
    "crypto/tls"
    "crypto/x509"
    "io/ioutil"

    "github.com/go-sql-driver/mysql"
)

func init() {
    rootCertPool := x509.NewCertPool()
    pem, err := ioutil.ReadFile("/path/ca-cert.pem")
    if err != nil {
        panic(err)
    }
    if ok := rootCertPool.AppendCertsFromPEM(pem); !ok {
        panic("Failed to append PEM.")
    }
    clientCert := make([]tls.Certificate, 0, 1)
    certs, err := tls.LoadX509KeyPair("/path/client-cert.pem", "/path/client-key.pem")
    if err != nil {
        panic(err)
    }
    clientCert = append(clientCert, certs)
    mysql.RegisterTLSConfig("custom", &tls.Config{
        RootCAs:      rootCertPool,
        Certificates: clientCert,
    })
}
```
[Reference](https://pkg.go.dev/github.com/go-sql-driver/mysql#RegisterTLSConfig)

### PostgreSQL

For PostgreSQL, you only need to add a few options to the `database.options` configuration entry.

```
sslmode=verify-full sslrootcert=root.crt sslkey=client.key sslcert=client.crt
```

Replace `root.crt`, `client.key` and `client.crt` with the paths to the corresponding files.

[Reference](https://pkg.go.dev/github.com/lib/pq#hdr-Connection_String_Parameters)

### MSSQL

Refer to the [driver's documentation](https://github.com/denisenkom/go-mssqldb#less-common-parameters).

## Migrations

It is **not recommended** to use Gorm's automatic migrations. Goyave encourages developers to use versioned schemas that can be synced between multiple developers and production servers easily. The framework doesn't provide any tool to do so directly because it is out of its scope. However, many great tools already exist for this purpose, such as [dbmate](https://github.com/amacneil/dbmate).