---
meta:
  - name: "og:title"
    content: "OpenAPI3 - Goyave Library"
  - name: "twitter:title"
    content: "OpenAPI3 - Goyave Library"
  - name: "title"
    content: "OpenAPI3 - Goyave Library"
---

# OpenAPI3

[Link to repository](https://github.com/go-goyave/openapi3)

An automated [OpenAPI 3](https://swagger.io/) specification generator for the [Goyave](https://github.com/go-goyave/goyave) REST API framework, using [kin-openapi/openapi3](https://pkg.go.dev/github.com/getkin/kin-openapi/openapi3) in the background.

Just from reading your code, this generator is able to fill an OpenAPI 3 specification with:
- Paths and operations
- Path parameters (with patterns)
- Body and query parameters
- Full support for validation
- File upload support
- Handler documentation (uses comments on Handler function)
- Server (uses config for domain name / host / port)
- SwaggerUI

*Note: this generator __doesn't__ create responses because it doesn't have any way to know what your handlers will return.*

## Usage

```
go get -u goyave.dev/openapi3
```

Add the following at the end of your main route registrer:
```go
spec := openapi3.NewGenerator().Generate(router)
json, err := spec.MarshalJSON()
if err != nil {
    panic(err)
}
fmt.Println(string(json))
```

You can alter the resulting [`openapi3.T`](https://pkg.go.dev/github.com/getkin/kin-openapi/openapi3#T) after generation. Like so, you can add responses details to your operations, top-level info, and more.

### SwaggerUI

You can serve a [SwaggerUI](https://swagger.io/tools/swagger-ui/) for your spec directly from your server using the built-in handler:

```go
spec := openapi3.NewGenerator().Generate(router)
opts := openapi3.NewUIOptions(spec)
openapi3.Serve(router, "/openapi", opts)
```

Then navigate to `http://localhost:8080/openapi` (provided you use the default port).