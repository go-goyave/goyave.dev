---
meta:
  - name: "og:title"
    content: "Utilities - Goyave"
  - name: "twitter:title"
    content: "Utilities - Goyave"
  - name: "title"
    content: "Utilities - Goyave"
---

# Utilities

[[toc]]

The Goyave framework offers a collection of utilities to ease development.

## fsutil

``` go
import "goyave.dev/goyave/v4/util/fsutil"
```

All files received in a request are stored in the `fsutil.File` structure. This structres gives all the information you need on a file and its content, as well as a helper function to save it easily.

| Attribute  | Type                    |
|------------|-------------------------|
| `Header`   | `*multipart.FileHeader` |
| `MIMEType` | `string`                |
| `Data`     | `multipart.File`        |

::: warning
The data in `file.Header` come from the client and **shouldn't be trusted**. The filename is always optional and must not be used blindly by the application: path information should be stripped, and conversion to the server file system rules should be done. You cannot rely on the size given in the header neither.
:::

::: table
[File.Save](#fsutil-file-save)
[GetFileExtension](#fsutil-getfileextension)
[GetMIMEType](#fsutil-getmimetype)
[FileExists](#fsutil-fileexists)
[IsDirectory](#fsutil-isdirectory)
[Delete](#fsutil-delete)
:::

#### fsutil.File.Save

Writes the given file on the disk.
Appends a timestamp to the given file name to avoid duplicate file names.
The file is not readable anymore once saved as its FileReader has already been closed.

Creates directories if needed.

Returns the actual file name.

| Parameters    | Return   |
|---------------|----------|
| `path string` | `string` |
| `name string` |          |

**Example:**
``` go
image := request.File("image")[0]
// As file fields can be multi-files uploads, a file field
// is always a slice.

name := request.String("name")
product := model.Product{
    Name: name,
    Price: request.Numeric("price"),
    Image: image.Save("storage/img", name)
}
database.Conn().Create(&product)
```

#### fsutil.GetFileExtension

Returns the last part of a file name. If the file doesn't have an extension, returns an empty string.

| Parameters    | Return   |
|---------------|----------|
| `file string` | `string` |

**Examples:**
``` go
fmt.Println(fsutil.GetFileExtension("README.md"))      // "md"
fmt.Println(fsutil.GetFileExtension("LICENSE"))        // empty string
fmt.Println(fsutil.GetFileExtension("archive.tar.gz")) // "gz"
```

#### fsutil.GetMIMEType

Get the MIME type and size of the given file. If the file cannot be opened, panics. You should check if the file exists, using `fsutil.FileExists()`, before calling this function.

| Parameters    | Return   |
|---------------|----------|
| `file string` | `string` |

**Examples:**
``` go
fmt.Println(fsutil.GetMIMEType("logo.png"))         // "image/png"
fmt.Println(fsutil.GetFileExtension("config.json")) // "application/json; charset=utf-8"
fmt.Println(fsutil.GetFileExtension("index.html"))  // "text/html; charset=utf-8"
```

#### fsutil.FileExists

Returns true if the file at the given path exists and is readable. Returns false if the given file is a directory.

| Parameters    | Return |
|---------------|--------|
| `file string` | `bool` |

**Example:**
``` go
fmt.Println(fsutil.FileExists("README.md")) // true
```

#### fsutil.IsDirectory

Returns true if the file at the given path exists, is a directory and is readable.

| Parameters    | Return |
|---------------|--------|
| `path string` | `bool` |

**Example:**
``` go
fmt.Println(fsutil.IsDirectory("README.md")) // false
fmt.Println(fsutil.IsDirectory("resources")) // true
```

#### fsutil.Delete

Delete the file at the given path. Panics if the file cannot be deleted.

You should check if the file exists, using `fsutil.FileExists()`, before calling this function.

| Parameters    | Return |
|---------------|--------|
| `file string` | `void` |

**Example:**
``` go
fsutil.Delete("README.md")
```

## httputil

``` go
import "goyave.dev/goyave/v4/util/httputil"
```

#### httputil.ParseMultiValuesHeader

Parses multi-values HTTP headers, taking the quality values into account. The result is a slice of values sorted according to the order of priority.

See: [https://developer.mozilla.org/en-US/docs/Glossary/Quality_values](https://developer.mozilla.org/en-US/docs/Glossary/Quality_values)

| Parameters      | Return                 |
|-----------------|------------------------|
| `header string` | `[]fsutil.HeaderValue` |

**HeaderValue struct:**

| Attribute  | Type      |
|------------|-----------|
| `Value`    | `string`  |
| `Priority` | `float64` |

**Examples:**
``` go
fmt.Println(httputil.ParseMultiValuesHeader("text/html,text/*;q=0.5,*/*;q=0.7"))
// [{text/html 1} {*/* 0.7} {text/* 0.5}]

fmt.Println(httputil.ParseMultiValuesHeader("text/html;q=0.8,text/*;q=0.8,*/*;q=0.8"))
// [{text/html 0.8} {text/* 0.8} {*/* 0.8}]
```

## reflectutil

``` go
import "goyave.dev/goyave/v4/util/reflectutil"
```

#### reflectutil.Only

Extracts the requested field from the given `map[string]` or structure and returns a `map[string]interface{}` containing only those values.

| Parameters         | Return                   |
|--------------------|--------------------------|
| `data interface{}` | `map[string]interface{}` |
| `fields ...string` |                          |

**Example:**
``` go
type Model struct {
  Field string
  Num   int
  Slice []float64
}
model := Model{
  Field: "value",
  Num:   42,
  Slice: []float64{3, 6, 9},
}
res := reflectutil.Only(model, "Field", "Slice")
```

Result:
```go
map[string]interface{}{
  "Field": "value",
  "Slice": []float64{3, 6, 9},
}
```

## sliceutil

``` go
import "goyave.dev/goyave/v4/util/sliceutil"
```

::: table
[IndexOf](#sliceutil-indexof)
[IndexOfStr](#sliceutil-indexofstr)
[Contains](#sliceutil-contains)
[ContainsStr](#sliceutil-containsstr)
[Equal](#sliceutil-equal)
:::

#### sliceutil.IndexOf

Get the index of the given value in the given slice, or `-1` if not found.

| Parameters          | Return |
|---------------------|--------|
| `slice interface{}` | `int`  |
| `value interface{}` |        |

**Example:**
``` go
slice := []interface{}{'r', "Goyave", 3, 2.42}
fmt.Println(sliceutil.IndexOf(slice, "Goyave")) // 1
```

#### sliceutil.IndexOfStr

Get the index of the given value in the given string slice, or `-1` if not found.

Prefer using this function instead of `IndexOf` for better performance.

| Parameters       | Return |
|------------------|--------|
| `slice []string` | `int`  |
| `value []string` |        |

**Example:**
``` go
slice := []string{"Avogado", "Goyave", "Pear", "Apple"}
fmt.Println(sliceutil.IndexOfStr(slice, "Goyave")) // 1
```

#### sliceutil.Contains

Check if a generic slice contains the given value.

| Parameters          | Return |
|---------------------|--------|
| `slice interface{}` | `bool` |
| `value interface{}` |        |

**Example:**
``` go
slice := []interface{}{'r', "Goyave", 3, 2.42}
fmt.Println(sliceutil.Contains(slice, "Goyave")) // true
```

#### sliceutil.ContainsStr

Check if a string slice contains the given value.

Prefer using this function instead of `Contains` for better performance.

| Parameters       | Return |
|------------------|--------|
| `slice []string` | `bool` |
| `value []string` |        |

**Example:**
``` go
slice := []string{"Avogado", "Goyave", "Pear", "Apple"}
fmt.Println(sliceutil.ContainsStr(slice, "Goyave")) // true
```

#### sliceutil.Equal

Check if two generic slices are the same.

| Parameters           | Return |
|----------------------|--------|
| `first interface{}`  | `bool` |
| `second interface{}` |        |

**Example:**
``` go
first := []string{"Avogado", "Goyave", "Pear", "Apple"}
second := []string{"Goyave", "Avogado", "Pear", "Apple"}
fmt.Println(sliceutil.Equal(first, second)) // false
```

## sqlutil

``` go
import "goyave.dev/goyave/v4/util/sqlutil"
```

#### sqlutil.EscapeLike

Escape "%" and "_" characters in the given string for use in SQL "LIKE" clauses.

| Parameters   | Return   |
|--------------|----------|
| `str string` | `string` |

**Example:**
``` go
search := sqlutil.EscapeLike("se%r_h")
fmt.Println(search) // "se\%r\_h"
```

## typeutil

``` go
import "goyave.dev/goyave/v4/util/typeutil"
```

::: table
[Map](#typeutil-map)
[ToFloat64](#typeutil-tofloat64)
[ToString](#typeutil-tostring)
:::

#### typeutil.Map

Map is an alias to `map[string]interface{}`. Useful and a cleaner way to create a JSON response object.

**Example:**
``` go
response.JSON(200, typeutil.Map{
  "name": "Albert Shirima",
  "projects": []typeutil.Map{
	  {
		  "name": "Goyave",
		  "is_contributor": true,
		  "meta": typeutil.Map{
			  "website": "goyave.dev",
			  "contributors": 4,
		  },
	  },
  },
})
```

#### typeutil.ToFloat64

Convert a numeric value to `float64`.

| Parameters          | Return    |
|---------------------|-----------|
| `value interface{}` | `float64` |
|                     | `error`   |

**Examples:**
``` go
fmt.Println(typeutil.ToFloat64(1.42))       // 1.42 nil
fmt.Println(typeutil.ToFloat64(1))          // 1.0 nil
fmt.Println(typeutil.ToFloat64("1.42"))     // 1.42 nil
fmt.Println(typeutil.ToFloat64("NaN"))      // NaN nil
fmt.Println(typeutil.ToFloat64([]string{})) // 0 'strconv.ParseFloat: parsing "[]": invalid syntax'
```

#### typeutil.ToString

Convert a generic value to string.

| Parameters          | Return   |
|---------------------|----------|
| `value interface{}` | `string` |

**Examples:**
``` go
fmt.Println(typeutil.ToString(1.42))       // "1.42"
fmt.Println(typeutil.ToString(nil))        // "nil"
fmt.Println(typeutil.ToString("hello"))    // "hello"
fmt.Println(typeutil.ToString([]string{})) // "[]"
```
