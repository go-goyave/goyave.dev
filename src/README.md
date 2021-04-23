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
         <p>Goyave is accessible, yet powerful. The framework includes routing, request parsing, validation, localization, testing, authentication, and more!</p>
      </div>
   </div>
</div>

<h1>Basics</h1>
<div>
  <slot-helper :tabs="['Hello world from scratch', 'Configuration', 'Environment', 'Routing']">
    <template #slot-desc-0>
      <div class="text">
        <p>
          The example beside shows a basic <code>Hello world</code> application using Goyave.
        </p>
      </div>
    </template>
    <template #slot-desc-1>
      <div class="text">
        <p>
          To configure your application, use the <code>config.json</code> file at your project's root. 
          If you are using the template project, copy <code>config.example.json</code> to <code>config.json</code>. The code beside is an example
          of configuration for a local development environment. If this config file misses some config entries, the default values will be used.
        </p>  
      </div>
    </template>
    <template #slot-desc-2>
      <div class="text">
        <p>
          All entries are validated. That means that the application will not start if you provided an invalid value in your config (for example if the specified port is not a number). 
          That also means that a goroutine trying to change a config entry with the incorrect type will panic. 
          Entries can be registered with a default value, their type and authorized values from any package.
        </p>
        <p>
          <a href="https://goyave.dev/guide/configuration.html" class="test">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-desc-3>
      <div class="text">
        <p>
          Routes definition is the action of associating a URI, sometimes having parameters, with a handler which will process the request and respond to it.
        </p>
        <p>
          Routes are defined in routes registrer functions. The main route registrer is passed to <code>goyave.Start()</code> and is executed automatically with a newly created root-level router.
        </p>
        <p>
          URIs can have parameters, defined using the format <code>{name}</code> or <code>{name:pattern}</code>. If a regular expression pattern is not defined, the matched variable will be anything until the next slash.
        </p>
        <p>
          Route parameters can be retrieved as a <code>map[string]string</code> in handlers using the request's <code>Params</code> attribute.
        </p>
        <p>
          <a href="https://goyave.dev/guide/basics/routing.html">Learn more</a>
        </p>  
      </div>
    </template>
    <template #slot-code-0>

  ```go
  import "goyave.dev/goyave/v3"

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

  </template>
  <template #slot-code-1>

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
  <template #slot-code-2>
  
  ```go
  config.GetString("app.name") // "goyave"
  config.GetBool("app.debug") // true
  config.GetInt("server.port") // 80
  config.Has("app.name") // true
  
  // Setting a value:
  config.Set("app.name", "my awesome app")
  
  // Using environment variables:
  {
    "database": {
      "host": "${DB_HOST}"
      }
  }
  ```

  </template>
  <template #slot-code-3>
  
  ```go
  func Register(router *goyave.Router) {
    // Register your routes here

    // With closure, not recommended
    router.Get("/hello", func(response *goyave.Response, r *goyave.Request) {
      response.String(http.StatusOK, "Hi!")
    })

    router.Get("/hello", myHandlerFunction)
    router.Post("/user", user.Register).Validate(user.RegisterRequest)
    router.Route("PUT|PATCH", "/user", user.Update).Validate(user.UpdateRequest)
    router.Route("POST", "/product", product.Store).Validate(product.StoreRequest).Middleware(middleware.Trim)
  }

  // define the URIs
  router.Get("/product/{key}", product.Show)
  router.Get("/product/{id:[0-9]+}", product.ShowById)
  router.Get("/category/{category}/{id:[0-9]+}", category.Show)

  // retrieve parameters as map[string]string
  func myHandlerFunction(response *goyave.Response, request *goyave.Request) {
      category := request.Params["category"]
      id, _ := strconv.Atoi(request.Params["id"])
      //...
    }

  }
  ```

  </template>
  </slot-helper>
</div>

<h1>More basics</h1>
<div>
  <slot-helper :tabs="['Controller', 'Middleware', 'Validation', 'Database']" background="bg-blue">
    <template #slot-desc-0>
      <div class="text">
        <p>
          Controllers are files containing a collection of Handlers related to a specific feature. Each feature should have its own package. 
          For example, if you have a controller handling user registration, user profiles, etc, you should create a <code>http/controller/user</code> package. 
          Creating a package for each feature has the advantage of cleaning up route definitions a lot and helps keeping a clean structure for your project.
        </p>
        <p>
          A <code>Handler</code> is a <code>func(*goyave.Response, *goyave.Request)</code>. The first parameter lets you write a response, and the second contains all the information extracted from the raw incoming request.
        </p>
        <p>
           Handlers receive a <code>goyave.Response</code> and a <code>goyave.Request</code> as parameters.
           <code>goyave.Request</code> can give you a lot of information about the incoming request, such as its headers, cookies, or body. 
           Learn more <a href="https://goyave.dev/guide/basics/requests.html">here</a>.
        </p>
        <p>
            <code>goyave.Response</code> implements <code>http.ResponseWriter</code> and is used to write a response. If you didn't write anything before the request lifecycle ends, <code>204 No Content</code> is automatically written. Learn everything about reponses <a href="https://goyave.dev/guide/basics/responses.html">here</a>.
        </p>
        <p>
          Let's take a very simple CRUD as an example beside for a controller definition : http/controller/product/product.go.
        </p>  
        <p>
          <a href="https://goyave.dev/guide/basics/controllers.html">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-desc-1>
      <div class="text">
       <p>
         Middleware are handlers executed before the controller handler. They are a convenient way to filter, intercept or alter HTTP requests entering your application. 
         For example, middleware can be used to authenticate users. 
         If the user is not authenticated, a message is sent to the user even before the controller handler is reached. However, if the user is authenticated, the middleware will pass to the next handler. Middleware can also be used to sanitize user inputs, by trimming strings for example, to log all requests into a log file, to automatically add headers to all your responses, etc.
        </p>  
        <p>
         To assign a middleware to a router, use the <code>router.Middleware()</code> function. Many middleware can be assigned at once. 
         The assignment order is important as middleware will be executed in order.
        </p>
        <p>Learn more about middleware in the <a href="https://goyave.dev/guide/basics/middleware.html">documentation</a>.</p>
      </div>
    </template>
    <template #slot-desc-2>
      <div class="text">
        <p>Goyave provides a powerful, yet easy way to validate all incoming data, no matter its type or its format, thanks to a large number of validation rules.</p>
        <p>Incoming requests are validated using rules set, which associate rules with each expected field in the request.</p>
        <p>Validation rules can alter the raw data. That means that when you validate a field to be number, if the validation passes, you are ensured that the data you'll be using in your controller handler is a <code>float64</code>. 
        Or if you're validating an IP, you get a net.IP object.</p>
        <p>Validation is automatic. You just have to define a rules set and assign it to a route. When the validation doesn't pass, the request is stopped and the validation errors messages are sent as a response.</p>
        <p>
        Rule sets are defined in the same package as the controller, typically in a separate file named <code>request.go</code>. Rule sets are named after the name of the controller handler they will be used with, and end with <code>Request</code>. 
        For example, a rule set for the <code>Store</code> handler will be named <code>StoreRequest</code>. If a rule set can be used for multiple handlers, consider using a name suited for all of them. 
        The rules for a store operation are often the same for update operations, so instead of duplicating the set, create one unique set called <code>UpsertRequest</code>.
        </p>
        <p>Example: (<code>http/controller/product/request.go</code>)</p>
        <p>
          <a href="https://goyave.dev/guide/basics/validation.html">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-desc-3>
      <div class="text">
        <p>Most web applications use a database. In this section, we are going to see how Goyave applications can query a database, using the awesome <a href="https://gorm.io/">Gorm ORM</a>.</p>
        <p>Database connections are managed by the framework and are long-lived. When the server shuts down, the database connections are closed automatically. So you don't have to worry about creating, closing or refreshing database connections in your application.</p>
        <p>Very few code is required to get started with databases. There are some <a href="https://goyave.dev/guide/configuration.html#configuration-reference">configuration</a> options that you need to change though:</p>
          <ul>
            <li><code>database.connection</code></li>
            <li><code>database.host</code></li>
            <li><code>database.port</code></li>
            <li><code>database.name</code></li>
            <li><code>database.username</code></li>
            <li><code>database.password</code></li>
            <li><code>database.options</code></li>
            <li><code>database.maxOpenConnection</code></li>
            <li><code>database.maxIdleConnection</code></li>
            <li><code>database.maxLifetime</code></li>
          </ul>
        <p>
          Models are usually just normal Golang structs, basic Go types, or pointers of them. <code>sql.Scanner</code> and <code>driver.Valuer</code> interfaces are also supported.
        </p>  
        <p>
          <a href="https://goyave.dev/guide/basics/database.html">Learn more</a>
        </p>
      </div>
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

  // assign a route
  router.Middleware(middleware.MyCustomMiddleware)
  ```

  </template>
  <template #slot-code-2>
  
  ```go
  var (
    StoreRequest validation.RuleSet = validation.RuleSet{
      "name":  {"required", "string", "between:3,50"},
      "price": {"required", "numeric", "min:0.01"},
      "image": {"nullable", "file", "image", "max:2048", "count:1"},
    }
  // ...

  // assign validation to your routes
  router.Post("/product", product.Store).Validate(product.StoreRequest)
  ```

  </template>
  <template #slot-code-3>

  ```go
  user := model.User{}
  db := database.Conn()
  db.First(&user)
  fmt.Println(user)

  // Model example
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
  </slot-helper>
</div>

<h1>Testing</h1>
<div>
  <slot-helper :tabs="['API TestSuite', 'TestSuite response body', 'More features']" background="bg-red">
    <template #slot-desc-0>
      <div class="text">
        <p>
          Goyave provides an API which is an extension of <a href="https://github.com/stretchr/testify">testify</a>. <code>goyave.TestSuite</code> inherits from testify's <code>suite.Suite</code>, and sets up the environment for you. That means:
        </p>
        <ul>
          <li><code>GOYAVE_ENV</code> environment variable is set to test and restored to its original value when the suite is done.</li>
          <li>All tests are run using your project's root as working directory. This directory is determined by the presence of a <code>go.mod</code> file.</li>
          <li>Config and language files are loaded before the tests start. As the environment is set to <code>test</code>, you need a <code>config.test.json</code> in the root directory of your project.</li>
        </ul>
        <p>This setup is done by the function <code>goyave.RunTest</code>, so you shouldn't run your test suites using testify's <code>suite.Run()</code> function.</p>
        <p>The example beside is a functional test and would be located in the test package.</p>
      </div>
    </template>
    <template #slot-desc-1>
      <div class="text">
        <p>When writing functional tests, you can retrieve the response body easily using <code>suite.GetBody(response)</code>.</p>
      </div>
    </template>
    <template #slot-desc-2>
      <div class="text">
        <p>
          The testing API has many more features such as record generators, factories, database helpers, a middleware tester, support for multipart and file uploads...
        </p>
        <p><a href="https://goyave.dev/guide/advanced/testing.html">Learn more</a>.</p>
      </div>
    </template>
    <template #slot-code-0>

  ```go
  import (
    "github.com/username/projectname/http/route"
    "goyave.dev/goyave/v3"
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
  <template #slot-code-1>

  ```go
  resp, err := suite.Get("/get", nil)
    suite.Nil(err)
    if err == nil {
      defer resp.Body.Close()
      suite.Equal("response content", string(suite.GetBody(resp)))
    }
  ```

  </template>
  <template #slot-code-2>

  ```go
  // URL-encoded requests
  headers := map[string]string{"Content-Type": "application/x-www-form-urlencoded; param=value"}
  resp, err := suite.Post("/product", headers, strings.NewReader("field=value"))
  suite.Nil(err)
  if err == nil {
    defer resp.Body.Close()
    suite.Equal("response content", string(suite.GetBody(resp)))
  }

  // JSON requests
  headers := map[string]string{"Content-Type": "application/json"}
  body, _ := json.Marshal(map[string]interface{}{"name": "Pizza", "price": 12.5})
  resp, err := suite.Post("/product", headers, bytes.NewReader(body))
  suite.Nil(err)
  if err == nil {
    defer resp.Body.Close()
    suite.Equal("response content", string(suite.GetBody(resp)))
  }

  // Testing JSON response
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
  </slot-helper>
</div>

<h1>Localization</h1>
<div>
  <slot-helper :tabs="['Language & directory', 'JSON files', 'Handling localization']" background="bg-blue">
    <template #slot-desc-0>
      <div class="text">
        <p>The Goyave framework provides a convenient way to support multiple languages within your application. Out of the box, Goyave only provides the <code>en-US</code> language.</p>
        <p>Language files are stored in the <code>resources/lang</code> directory.</p>
      </div>
    </template>
    <template #slot-desc-1>
      <div class="text">
        <p>
          The <code>fields.json</code> file contains the field names translations and their rule-specific messages. Translating field names helps making more expressive messages instead of showing the technical field name to the user. 
          Rule-specific messages let you override a validation rule message for a specific field.
        </p>
        <p>The <code>locale.json</code> file contains all language lines that are not related to validation. This is the place where you should write the language lines for your user interface or for the messages returned by your controllers.</p>
        <p>
          The <code>rules.json</code> file contains the validation rules messages. These messages can have <a href="https://goyave.dev/guide/basics/validation.html#placeholders">placeholders</a>, which will be automatically replaced by the validator with dynamic values. 
          If you write custom validation rules, their messages shall be written in this file.
        </p>
      </div>
    </template>
    <template #slot-desc-2>
      <div class="text">
        <p>
          When an incoming request enters your application, the core language middleware checks if the Accept-Language header is set, and set the <code>goyave.Request</code>'s Lang attribute accordingly. Localization is handled automatically by the validator.
        </p>
        <p><a href="https://goyave.dev/guide/advanced/localization.html">Learn more</a></p>
      </div>
    </template>
    <template #slot-code-0>

  ```
  .
  └── resources
    └── lang
      └── en-US (language name)
        ├── fields.json (optional)
        ├── locale.json (optional)
        └── rules.json (optional)
  ```

  </template>
  <template #slot-code-1>

  ```json
  // fields.json
  {
    "email": {
    "name": "email address",
      "rules": {
        "required": "You must provide an :field."
      }
    }
  }
  // locale.json 
  {
    "product.created": "The product have been created with success.",
    "product.deleted": "The product have been deleted with success."
  }
  // rules.json
  {
    "integer": "The :field must be an integer.",
    "starts_with": "The :field must start with one of the following values: :values.",
    "same": "The :field and the :other must match."
  }
  ```

  </template>
  <template #slot-code-2>

  ```go
  func ControllerHandler(response *goyave.Response, request *goyave.Request) {
    response.String(http.StatusOK, lang.Get(request.Lang, "my-custom-message"))
  }
  ```

  </template>
  </slot-helper>
</div>

<h1>Other advanced</h1>
<div>
  <slot-helper :tabs="['Status handlers', 'CORS', 'Authentication']">
    <template #slot-desc-0>
      <div class="text">
        <p>
          Status handlers are regular handlers executed during the finalization step of the request's lifecycle if the response body is empty but a status code has been set. 
          Status handler are mainly used to implement a custom behavior for user or server errors (400 and 500 status codes).
        </p>
        <p>
          The exemple beside shows the file </ode>http/controller/status/status.go</code> (example of custom 404 error handling) and an exemple of the status handlers registered in the router.
        </p>
        <p>
          <a href="https://goyave.dev/guide/advanced/status-handlers.html">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-desc-1>
      <div class="text">
        <p>
          Goyave provides a built-in CORS module. CORS options are set on routers. If the passed options are not <code>nil</code>, the CORS core middleware is automatically added.
        </p>
        <p>
          CORS options should be defined before middleware and route definition. All of this router's sub-routers inherit CORS options by default. 
          If you want to remove the options from a sub-router, or use different ones, simply create another <code>cors.Options</code> object and assign it.
        </p>
        <p>
          <code>cors.Default()</code> can be used as a starting point for custom configuration.
        </p>
        <p>
          <a href="https://goyave.dev/guide/advanced/cors.html">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-desc-2>
      <div class="text">
        <p>
          Goyave provides a convenient and expandable way of handling authentication in your application. Authentication can be enabled when registering your routes (first example beside).
        </p>
        <p>
          Authentication is handled by a simple middleware calling an Authenticator. This middleware also needs a model, which will be used to fetch user information on a successful login.
        </p>
        <p>
          Authenticators use their model's struct fields tags to know which field to use for username and password. To make your model compatible with authentication, you must add the <code>auth:"username"</code> and <code>auth:"password"</code> tags.
        </p>
        <p>When a user is successfully authenticated on a protected route, its information is available in the controller handler, through the request <code>User</code> field.</p>
        <p>
          <a href="https://goyave.dev/guide/advanced/authentication.html">Learn more</a>
        </p>
      </div>
    </template>
    <template #slot-code-0>

  ```go
  // file http/controller/status/status.go
  package status

  import "goyave.dev/goyave/v3"

  func NotFound(response *goyave.Response, request *goyave.Request) {
    if err := response.RenderHTML(response.GetStatus(), "errors/404.html", nil); err != nil {
      response.Error(err)
    }
  }

  // Use "status.NotFound" for empty responses having status 404 or 405.
  router.StatusHandler(status.NotFound, 404)
  ```

  </template>
  <template #slot-code-1>

  ```go
  // built-in CORS module
  router.CORS(cors.Default())

  // CORS options
  options := cors.Default()
  options.AllowedOrigins = []string{"https://google.com", "https://images.google.com"}
  router.CORS(options)


  ```

  </template>
  <template #slot-code-2>

  ```go
  // enable authentication
  import "goyave.dev/goyave/v3/auth"
  //...
  authenticator := auth.Middleware(&model.User{}, &auth.BasicAuthenticator{})
  router.Middleware(authenticator)

  // Authenticator's model
  type User struct {
    gorm.Model
    Email    string `gorm:"type:char(100);uniqueIndex" auth:"username"`
    Name     string `gorm:"type:char(100)"`
    Password string `gorm:"type:char(60)" auth:"password"`
  }

  // Authenticator controller handler example
  func Hello(response *goyave.Response, request *goyave.Request) {
    user := request.User.(*model.User)
    response.String(http.StatusOK, "Hello " + user.Name)
  }
  ```

  </template>
  </slot-helper>
</div>