---
title: "File systems"
description: "Goyave was designed with flexible file systems in mind, based on Go's standard io/fs API"
---

# File systems

[[toc]]

## Introduction

Goyave was designed with flexible file systems in mind, based on Go's standard [`io/fs`](https://pkg.go.dev/io/fs) API. All features that rely on files are compatible with this API, and can use any implementation. The following is a non-exhaustive list of uses of file systems:
- Embedded configuration
- Embedded language files
- Embedded static resources (HTML templates or web resources such as CSS, JS, etc)
- Remote static resources (served by a cloud storage bucket for example)
- User content storage (on cloud storage, or on the local OS file system)

The [`goyave.dev/goyave/v5/util/fsutil`](https://pkg.go.dev/goyave.dev/goyave/v5/util/fsutil) package provides some useful file-related functions, as well a additional interfaces for file systems, such as:
- `fsutil.FS`: a FS that implements both `fs.ReadDirFS` and `fs.StatFS`
- `fsutil.WorkingDirFS`: a FS that can return a working directory
- `fsutil.MkdirFS`: a FS capable of creating directories with `Mkdir()` and `MkdirAll()`
- `fsutil.WritableFS`: a FS that can `OpenFile()`, supporting write operations
- `fsutil.RemoveFS`: a FS capable of removing files with `Remove()` and `RemoveAll()`

:::tip
It is encouraged to work with file system interfaces whenever you are working with any kind of file. On top of being very flexible on your file sources, this also helps when writing tests.
:::

## OS

An implementation of the OS's local file system is available at [`goyave.dev/goyave/v5/util/fsutil/osfs`](https://pkg.go.dev/goyave.dev/goyave/v5/util/fsutil/osfs). This way, you can use the local file system just like any other file system.

This implementation is compatible with features expecting the following interfaces:
- `fsutil.FS`
- `fsutil.WorkingDirFS`
- `fsutil.MkdirFS`
- `fsutil.WritableFS`
- `fsutil.RemoveFS`

You can also get a sub file-system with `(&osfs.FS{}).Sub("path")`. Using the resulting file system will always append a path prefix to the name of the requested files. For example, with this file system, using `Open("test.txt")` will try to open `path/test.txt`.

:::info
If you are using Go 1.24+, you can use [`os.Root`](https://pkg.go.dev/os#Root.FS) instead of `osfs.FS` for additional security. The `fs.FS` returned by the `FS()` method is compatible with the `fsutil.FS` interface.
```go
root, _ := os.OpenRoot("resources/public")
fs := root.FS().(fsutil.FS)
```
:::

## Embed

The standard [`embed.FS`](https://pkg.go.dev/embed#FS) file system allows to embed multiple files into the compiled application binary as a read-only collection. However, it is inconvenient to use when you need to `Stat()` or `Sub()` (getting a sub file system), as these methods are not implemented.

Goyave provides a wrapper that extends the standard type so it is also compatible with features expecting `fs.StatFS` or `fs.SubFS`. This wrapper is named `fsutil.Embed`.

```go
import (
	"embed"
	"fmt"
	"os"

	"goyave.dev/goyave/v5/util/errors"
	"goyave.dev/goyave/v5/util/fsutil"
)

//go:embed resources
var resources embed.FS

func main() {
	resources := fsutil.NewEmbed(resources)
	langFS, err := resources.Sub("resources/lang")
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}
	//...
}
```

:::tip
You can use such embedded file systems to serve static resources as explained [here](/basics/routing.html#serve-static-resources). 
:::

## File system services

File system instances should ideally be stored inside a **service**. For example, if you embed your `resources` directory, create a "static" service so your static resources are accessible from anywhere in your application:
```go
// service/static/static.go
package static

import (
	"goyave.dev/goyave/v5/util/fsutil"
	"my-project/service"
)

type Service struct {
	fs fsutil.Embed
}

func NewService(embed fsutil.Embed) *Service {
	return &Service{
		fs: embed,
	}
}

func (s Service) FS() fsutil.Embed {
	return s.fs
}

func (s Service) Name() string {
	return service.Static
}

```

## File upload

Goyave's [parse middleware](/basics/middleware.html#parse) supports file upload using `multipart/form-data` forms. All file parts are automatically converted to `[]fsutil.File`. Inside `request.Data`, a field of type "file" will therefore always be of type `[]fsutil.File` (even if not validated). It is a slice so it support multi-file uploads in a single field.

`fsutil.File` stores the `*multipart.FileHeader` and automatically determines the file's MIME type by reading its first 512 bytes.

It also provides a `Save()` method for easy storage. This method will append a timestamp to the given file name to avoid duplicate file names.

```go
func (ctrl *Controller) UploadFiles(response *goyave.Response, request *goyave.Request) {
	data := request.Data.(map[string]any) // multipart forms are always objects
	files := data["files"].([]fsutil.File)
	for i, f := range files {
		actualName, err := f.Save(&osfs.FS{}, "/usercontent", fmt.Sprintf("userfile_%d", i+1))
		if err != nil {
			response.Error(err)
			return
		}
		ctrl.Logger().Debug("File saved", "filename", actualName)
	}
	//...
}
```

:::info
`fsutil.File` **can** be used inside DTOs thanks to a special implementation of `json.Marhsaler`/`json.Unmarhsaler`.
:::
