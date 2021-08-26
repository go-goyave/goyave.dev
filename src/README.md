---
home: true
heroImage: /goyave_512.png
actionText: Get Started →
actionLink: /guide/
footer: MIT Licensed | Copyright © 2019 Jérémy LAMBERT (SystemGlitch)
meta:
  - name: "og:title"
    content: "Goyave - Elegant Golang REST Framework"
  - name: "twitter:title"
    content: "Goyave - Elegant Golang REST Framework"
  - name: "title"
    content: "Goyave - Elegant Golang REST Framework"
---

<p class="center">
Goyave is a progressive and accessible web application framework focused on REST APIs, aimed at making backend development easy and enjoyable. It has a philosophy of cleanliness and conciseness to make programs more elegant, easier to maintain and more focused. Get started quickly and master all its powerful functionalities thanks to its extensive documentation.
</p>

<div class="features">
   <div class="feature" id="feature-clean">
      <img :src="$withBase('/undraw_code_typing_7jnv.svg')" width="275" alt="Clean">
      <div>
         <h2>Clean Code</h2>
         <p>Goyave has an expressive, elegant syntax, a robust structure and conventions. Minimalist calls and reduced redundancy are among the Goyave's core principles.</p>
      </div>
   </div>
   <div class="feature" id="feature-fast">
      <img :src="$withBase('/undraw_speed_test_wxl0.svg')" width="275" alt="Fast">
      <div>
         <h2>Fast Development</h2>
         <p>Develop faster and concentrate on the business logic of your application thanks to the many helpers and built-in functions.</p>
      </div>
   </div>
   <div class="feature" id="feature-powerful">
      <img :src="$withBase('/undraw_upgrade_06a0.svg')" width="275" alt="Powerful">
      <div>
         <h2>Powerful functionalities</h2>
         <p>Goyave is accessible, yet powerful. The framework includes routing, request parsing, validation, localization, testing, authentication, error handling and more!</p>
      </div>
   </div>
</div>

<div class="used-by">
    <h2>Used By</h2>
    <div>
        <span class="used-by-company">
        <a href="https://adagio.io" target="_blank" rel="nofollow">
            <img src="usedby/adagio.webp" alt="Adagio.io"/>
        </a>
        </span>
    </div>
    <p>Do you want to be featured here? <a href="https://github.com/go-goyave/goyave/issues/new" target="_blank" rel="nofollow">Open an issue</a>.</p>
</div>

---

## Hello world from scratch

```go
import "goyave.dev/goyave/v4"

func registerRoutes(router *goyave.Router) {
    router.Get("/hello", func(response *goyave.Response, request *goyave.Request) {
      response.String(http.StatusOK, "Hello world!")
    })
}

func main() {
    if err := goyave.Start(registerRoutes); err != nil {
      os.Exit(err.(*goyave.Error).ExitCode)
    }
}
```

## Routing
<div><showcase :tabs="['Basics', 'Parameters']">
  <template #slot-desc-0>

  Routing is an essential part of any Goyave application. Routes definition is the action of associating a URI, sometimes having parameters, with a handler which will process the request and respond to it. Separating and naming routes clearly is important to make your API or website clear and expressive.
  
  [Learn more](./guide/basics/routing.html)

  </template>
  <template #slot-desc-1>

  URIs can have parameters, defined using the format `{name}` or `{name:pattern}`. If a regular expression pattern is not defined, the matched variable will be anything until the next slash. Route parameters can be retrieved as a `map[string]string` in handlers using the request's `Params` attribute.

  [Learn more](./guide/guide/basics/routing.html#route-parameters)

  </template>
  <template #slot-code-0>

  ```go
  func Register(router *goyave.Router) {
      // Register your routes here

      router.Get("/hello", func(response *goyave.Response, r *goyave.Request) {
          response.String(http.StatusOK, "Hi!")
      })

      router.Get("/hello", myHandlerFunction)
      router.Post("/user", user.Register).Validate(user.RegisterRequest)
      router.Route("PUT|PATCH", "/user", user.Update).Validate(user.UpdateRequest)
      router.Route("POST", "/product", product.Store).Validate(product.StoreRequest).Middleware(middleware.Trim)
  }
  ```

  </template>
  <template #slot-code-1>
  
  ```go
  func Register(router *goyave.Router) {
      router.Get("/product/{key}", product.Show)
      router.Get("/product/{id:[0-9]+}", product.ShowById)
      router.Get("/category/{category}/{id:[0-9]+}", category.Show)
  }

  func myHandlerFunction(response *goyave.Response, request *goyave.Request) {
      category := request.Params["category"]
      id, _ := strconv.Atoi(request.Params["id"])
      //...
  }
  ```

  </template>
</showcase></div>

## Handlers
<div><showcase :tabs="['Controllers', 'Middleware', 'Status handler']" background="bg-blue">
  <template #slot-desc-0>

  A `Handler` is a `func(*goyave.Response, *goyave.Request)`. The first parameter lets you write a response, and the second contains all the information extracted from the raw incoming request. Controllers are files containing a collection of Handlers related to a specific feature.
  
  [Learn more](./guide/basics/controllers.html)

  </template>
  <template #slot-desc-1>

  Middleware are handlers executed before the controller handler. They are a convenient way to filter, intercept or alter HTTP requests entering your application.

  [Learn more](./guide/basics/middleware.html)

  </template>
  <template #slot-desc-2>

  Status handlers are regular handlers executed during the finalization step of the request's lifecycle if the response body is empty but a status code has been set. Status handler are mainly used to implement a custom behavior for user or server errors (400 and 500 status codes).

  [Learn more](./guide/advanced/status-handlers.html)

  </template>
  <template #slot-code-0>

  ```go
  func Index(response *goyave.Response, request *goyave.Request) {
      products := []model.Product{}
      result := database.Conn().Find(&products)
      if response.HandleDatabaseError(result) {
          response.JSON(http.StatusOK, products)
      }
  }

  func Show(response *goyave.Response, request *goyave.Request) {
      product := model.Product{}
      result := database.Conn().First(&product, request.Params["id"])
      if response.HandleDatabaseError(result) {
          response.JSON(http.StatusOK, product)
      }
  }

  func Store(response *goyave.Response, request *goyave.Request) {
      product := model.Product{
          Name:  request.String("name"),
          Price: request.Numeric("price"),
      }
      if err := database.Conn().Create(&product).Error; err != nil {
          response.Error(err)
      } else {
          response.JSON(http.StatusCreated, map[string]uint{"id": product.ID})
      }
  }

  func Update(response *goyave.Response, request *goyave.Request) {
      product := model.Product{}
      db := database.Conn()
      result := db.Select("id").First(&product, request.Params["id"])
      if response.HandleDatabaseError(result) {
          if err := db.Model(&product).Update("name", request.String("name")).Error; err != nil {
              response.Error(err)
          }
      }
  }

  func Destroy(response *goyave.Response, request *goyave.Request) {
      product := model.Product{}
      db := database.Conn()
      result := db.Select("id").First(&product, request.Params["id"])
      if response.HandleDatabaseError(result) {
          if err := db.Delete(&product).Error; err != nil {
              response.Error(err)
          }
      }
  }
  ```

  </template>
  <template #slot-code-1>
  
  ```go
  func MyCustomMiddleware(next goyave.Handler) goyave.Handler {
      return func(response *goyave.Response, request *goyave.Request) {
          // Do something
          next(response, request) // Pass to the next handler
      }
  }
  ```

  </template>
  <template #slot-code-2>

  ```go
  package status

  import "goyave.dev/goyave/v4"

  func NotFound(response *goyave.Response, request *goyave.Request) {
      if err := response.RenderHTML(response.GetStatus(), "errors/404.html", nil); err != nil {
          response.Error(err)
      }
  }
  ```

  </template>
</showcase></div>

## Configuration
<div><showcase :tabs="['Configuration', 'Get, set', 'Environment']">
  <template #slot-desc-0>

  The framework provides a powerful configuration system. All entries are validated. That means that the application will not start if you provided an invalid value in your config (for example if the specified port is not a number). Entries can be registered with a default value, their type and authorized values from any package.
  
  [Learn more](./guide/configuration.html)

  </template>
  <template #slot-desc-1>

  All entries are validated. That means that the application will not start if you provided an invalid value in your config (for example if the specified port is not a number).

  [Learn more](./guide/configuration.html#getting-a-value)

  </template>
  <template #slot-desc-2>

  Configuration supports the usage of environment variables.

  [Learn more](./guide/configuration.html#using-environment-variables)

  </template>
  <template #slot-code-0>

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
      "maxUploadSize": 10
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

  </template>
  <template #slot-code-1>
  
  ```go
  config.GetString("app.name") // "goyave"
  config.GetBool("app.debug") // true
  config.GetInt("server.port") // 80
  config.Has("app.name") // true
  
  // Setting a value:
  config.Set("app.name", "my awesome app")
  ```

  </template>
  <template #slot-code-2>
  
  ```json
  {
    "database": {
      "host": "${DB_HOST}"
      }
  }
  ```

  </template>
</showcase></div>

## Validation
<div><showcase :tabs="['Validation', 'Conversion', 'Arrays', 'Objects']" background="bg-blue">
  <template #slot-desc-0>

  Goyave provides a powerful, yet easy way to validate all incoming data, no matter its type or its format, thanks to a large number of validation rules. Validation is automatic. You just have to define a rules set and assign it to a route. When the validation doesn't pass, the request is stopped and the validation errors messages are sent as a response.
  
  [Learn more](./guide/basics/validation.html)

  </template>
  <template #slot-desc-1>

  Validation rules can **alter the raw data**. That means that when you validate a field to be number, if the validation passes, you are ensured that the data you'll be using in your controller handler is a `float64`. Or if you're validating an IP, you get a `net.IP` object.

  [Learn more](./guide/basics/validation.html)

  </template>
  <template #slot-desc-2>

  Validating arrays is easy. All the validation rules can be applied to array values. When array values are validated, all of them must pass the validation.

  [Learn more](./guide/basics/validation.html#validating-arrays)

  </template>
  <template #slot-desc-3>

  You can validate objects using a **dot-separated** notation.

  [Learn more](./guide/basics/validation.html#validating-objects)

  </template>
  <template #slot-code-0>

  ```go
  var (
      StoreRequest validation.RuleSet = validation.RuleSet{
          "name":  validation.List{"required", "string", "between:3,50"},
          "price": validation.List{"required", "numeric", "min:0.01"},
          "image": validation.List{"nullable", "file", "image", "max:2048", "count:1"},
      }
  )

  //...
  
  router.Post("/product", product.Store).Validate(product.StoreRequest)
  ```

  </template>
  <template #slot-code-1>
  
  ```go
  var (
      StoreRequest validation.RuleSet = validation.RuleSet{
          "name":  validation.List{"required", "string", "between:3,50"},
          "price": validation.List{"required", "numeric", "min:0.01"},
          "image": validation.List{"nullable", "file", "image", "max:2048", "count:1"},
      }
  )

  //...

  router.Post("/product", product.Store).Validate(product.StoreRequest)
  ```

  </template>
  <template #slot-code-2>
  
  ```go
  var arrayValidation = validation.RuleSet{
      "array":   validation.List{"required", "array:string", "between:1,5"},
      "array[]": validation.List{"email", "max:128"}
  }

  var nDimensionalArrayValidation = RuleSet{
      "array":       validation.List{"required", "array"},
      "array[]":     validation.List{"array", "max:3"},
      "array[][]":   validation.List{"array:numeric"},
      "array[][][]": validation.List{"numeric", "max:4"},
  }

  ```

  </template>
  <template #slot-code-3>
  
  ```go
  var (
      StoreRequest = validation.RuleSet{
          "user":       validation.List{"required", "object"},
          "user.name":  validation.List{"required", "string", "between:3,50"},
          "user.email": validation.List{"required", "email"},
      }
  )

  //...

  router.Post("/register", user.Store).Validate(user.StoreRequest)
  ```

  </template>
</showcase></div>

## Database
<div><showcase :tabs="['Gorm', 'Models', 'Pagination']">
  <template #slot-desc-0>

  Most web applications use a database. In this section, we are going to see how Goyave applications can query a database, using the awesome [Gorm ORM](https://gorm.io/).
  
  [Learn more](./guide/basics/database.html)

  </template>
  <template #slot-desc-1>

  Models are usually just normal Golang structs, basic Go types, or pointers of them. `sql.Scanner` and `driver.Valuer` interfaces are also supported.

  [Learn more](./guide/basics/database.html#models)

  </template>
  <template #slot-desc-2>

  `database.Paginator` is a tool that helps you paginate records. This structure contains pagination information (current page, maximum page, total number of records), which is automatically fetched. You can send the paginator directly to the client as a response.

  [Learn more](./guide/basics/database.html#pagination)

  </template>
  <template #slot-code-0>

  ```go
  // Create
  db.Create(&Product{Code: "D42", Price: 100})

  // Read
  var product Product
  db.First(&product, 1) // find product with integer primary key
  db.First(&product, "code = ?", "D42") // find product with code D42

  // Update - update product's price to 200
  db.Model(&product).Update("Price", 200)
  // Update - update multiple fields
  db.Model(&product).Updates(Product{Price: 200, Code: "F42"}) // non-zero fields
  db.Model(&product).Updates(map[string]interface{}{"Price": 200, "Code": "F42"})

  // Delete - delete product
  db.Delete(&product, 1)
  ```

  </template>
  <template #slot-code-1>
  
  ```go
  func init() {
      database.RegisterModel(&User{})
  }

  type User struct {
      gorm.Model
      Name         string
      Age          sql.NullInt64
      Birthday     *time.Time
      Email        string  `gorm:"type:varchar(100);uniqueIndex"`
      Role         string  `gorm:"size:255"` // set field size to 255
      MemberNumber *string `gorm:"unique;not null"` // set member number to unique and not null
      Num          int     `gorm:"autoIncrement"` // set num to auto incrementable
      Address      string  `gorm:"index:addr"` // create index with name `addr` for address
      IgnoreMe     int     `gorm:"-"` // ignore this field
  }
  ```

  </template>
  <template #slot-code-2>
  
  ```go
  func Index(response *goyave.Response, request *goyave.Request) {
      articles := []model.Article{}
      page := 1
      if request.Has("page") {
          page = request.Integer("page")
      }
      pageSize := DefaultPageSize
      if request.Has("pageSize") {
          pageSize = request.Integer("pageSize")
      }

      tx := database.Conn()

      if request.Has("search") {
          search := helper.EscapeLike(request.String("search"))
          tx = tx.Where("title LIKE ?", "%"+search+"%")
      }

      paginator := database.NewPaginator(tx, page, pageSize, &articles)
      result := paginator.Find()
      if response.HandleDatabaseError(result) {
          response.JSON(http.StatusOK, paginator)
      }
  }
  ```

  </template>
</showcase></div>

## Testing
<div><showcase :tabs="['Testify', 'Suites', 'Responses', 'Factories']" background="bg-blue">
  <template #slot-desc-0>

  Goyave provides an API to ease the unit and functional testing of your application. This API is an extension of [testify](https://github.com/stretchr/testify). `goyave.TestSuite` inherits from testify's `suite.Suite`, and sets up the environment for you.
  
  [Learn more](./guide/advanced/testing.html)

  </template>
  <template #slot-desc-1>

  Goyave provides an API to ease the unit and functional testing of your application. This API is an extension of [testify](https://github.com/stretchr/testify). `goyave.TestSuite` inherits from testify's `suite.Suite`, and sets up the environment for you.
  
  [Learn more](./guide/advanced/testing.html)

  </template>
  <template #slot-desc-2>

  `goyave.TestSuite` makes it easy to test and check the content of your responses, even for JSON responses. You will also find utilities to generate multipart forms.

  [Learn more](./guide/advanced/testing.html##testing-json-reponses)

  </template>
  <template #slot-desc-3>

  You may need to test features interacting with your database. Goyave provides a handy way to generate and save records in your database: **factories**.

  [Learn more](./guide/advanced/testing.html#database-testing)

  </template>
  <template #slot-code-0>

  ```go
  // assert equality
  assert.Equal(t, 123, 123, "they should be equal")

  // assert inequality
  assert.NotEqual(t, 123, 456, "they should not be equal")

  // assert for nil (good for errors)
  assert.Nil(t, object)

  // assert for not nil (good when you expect something)
  if assert.NotNil(t, object) {

      // now we know that object isn't nil, we are safe to make
      // further assertions without causing any errors
      assert.Equal(t, "Something", object.Value)

  }
  ```

  </template>
  <template #slot-code-1>
  
  ```go
  import (
      "github.com/username/projectname/http/route"
      "goyave.dev/goyave/v4"
  )

  type CustomTestSuite struct {
      goyave.TestSuite
  }

  func (suite *CustomTestSuite) TestHello() {
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
  }

  func TestCustomSuite(t *testing.T) {
      goyave.RunTest(t, new(CustomTestSuite))
  }
  ```

  </template>
  <template #slot-code-2>
  
  ```go
  suite.RunServer(route.Register, func() {
      resp, err := suite.Get("/product", nil)
      suite.Nil(err)
      if err == nil {
          defer resp.Body.Close()
          json := map[string]interface{}{}
          err := suite.GetJSONBody(resp, &json)
          suite.Nil(err)
          if err == nil { // You should always check parsing error before continuing.
              suite.Equal("value", json["field"])
              suite.Equal(float64(42), json["number"])
          }
      }
  })
  ```

  </template>
  <template #slot-code-3>

  ```go
  func UserGenerator() interface{} {
      user := &User{}
      user.Name = faker.Name()

      faker.SetGenerateUniqueValues(true)
      user.Email = faker.Email()
      faker.SetGenerateUniqueValues(false)
      return user
  }

  //...

  factory := database.NewFactory(model.UserGenerator)

  // Generate 5 random users
  records := factory.Generate(5).([]*model.User)

  // Generate and insert 5 random users into the database
  insertedRecords := factory.Save(5).([]*model.User)
  ```

  </template>
</showcase></div>

<div class="bottom-hero">
  <p class="bottom-hero-title">And that's not all!</p>
  <span class="nav-link action-button">
  
  [Get Started →](/guide/)
  
  </span>
</div>