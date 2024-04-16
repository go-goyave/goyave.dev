---
title: "Localization"
description: "The Goyave framework provides a convenient way to support multiple languages within your application."
---

# Localization

[[toc]]

## Introduction

The Goyave framework provides a convenient way to support multiple languages within your application. Out of the box, Goyave only provides the `en-US` language, but you can add as many as you want.

:::mono
.
└── resources
    └── lang
        └── en-US (*language name*)
            ├── fields.json (*optional*)
            ├── locale.json (*optional*)
            └── rules.json (*optional*)
:::

Each language has its own directory and should be named with an [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language code. You can also append a variant to your languages: `en-US`, `en-UK`, `fr-FR`, `fr-CA`, ... **Case is important.**

Each language directory contains three files. Each file is **optional**.
- `fields.json`: field names translations and field-specific rule messages.
- `locale.json`: all other language lines.
- `rules.json`: validation rules messages.

:::info
All directories in the `resources/lang` directory are automatically loaded when the server is created.
:::

## Language files

### Fields

The `fields.json` file contains the field names translations. Translating field names helps making more expressive messages instead of showing the technical field name to the user.

**Example:**
``` json
{
    "email": "email address"
}
```

As a result, the `:field` placeholder in validation error messages will be filled with "email address" instead of the raw field name "email".

:::info
Learn more about validation messages placeholders in the [validation](/basics/validation.html#placeholders) section.
:::

### Locale

The `locale.json` file contains all language lines that are **not** related to validation. This is the place where you should write the language lines for your user interface or for the messages returned by your controllers.

**Example:**
``` json
{
    "product.created": "The product has been created with success.",
    "product.deleted": "The product has been deleted with success."
}
```
::: tip
It is a good practice to use **dot-separated** names for language lines to help making them clearer and more expressive.
:::

### Rules

The `rules.json` file contains the validation rules messages. These messages can have **[placeholders](/basics/validation.html#placeholders)**, which will be automatically replaced by the validator with dynamic values. If you write custom validation rules, their messages shall be written in this file.

**Example:**

``` json
{
    "integer": "The :field must be an integer.",
    "starts_with": "The :field must start with one of the following values: :values.",
    "same": "The :field and the :other must match."
}
```

:::tip
- If you define the `en-US`  language in your application, the default language lines will be overridden by the ones in your language files, and all the undefined ones will be kept.
- The validation rules localization is explained in more details [here](/basics/validation.html#localization).
:::

## Manual loading

It is possible to load a language directory manually from another location. If the loaded language is already available in your application, the newly loaded one will override the previous by being merged into it.

```go{29,30}
import (
	"embed"
	"fmt"
	"os"

	"goyave.dev/goyave/v5"
	"goyave.dev/goyave/v5/lang"
	"goyave.dev/goyave/v5/util/errors"
	"goyave.dev/goyave/v5/util/fsutil"
)

//go:embed resources
var resources embed.FS

func main() {
	server, err := goyave.New(goyave.Options{})
	if err != nil {
		fmt.Fprintln(os.Stderr, err.(*errors.Error).String())
		os.Exit(1)
	}

	resources := fsutil.NewEmbed(resources)
	langFS, err := resources.Sub("resources/lang")
	if err != nil {
		server.Logger.Error(err)
		os.Exit(1)
	}

	err = server.Lang.Load(langFS, "en-CA", "lang/en-CA")
	err = server.Lang.LoadDirectory(langFS, "lang")
	//...
}
```

:::tip
Any filesystem implementing `fsutil.FS` can be used. Use `osfs.FS` if you don't want to use an embedded filesystem.
:::

## Using localization

There are two important structures to know about:
- `*lang.Languages`: a container for all loaded languages, it defines the default language as well. This container is accessible to all **components**.
- `*lang.Language`: a single language, containing all localized lines.

When an incoming request enters your application, the built-in language middleware checks if the `Accept-Language` header is set, and set the `*goyave.Request.Lang` field with the identified `*lang.Language`, or the default one.

You can get a localized string using the language's `Get()` mehtod.

```go
func (ctrl *Controller) Handle(response *goyave.Response, request *goyave.Request) {
	request.Lang.Get("customMessage")
	// or
	ctrl.Lang().GetDefault().Get("customMessage")
	ctrl.Lang().Get("en-US", "customMessage")
}
```

### Paths

- Custom lines defined in `locale.json` are accessed with their key directly.
- Validation rules messages defined in `rules.json` are accessed with the `validation.rules` prefix:
	- `validation.rules.<rule_name>`
	- `validation.rules.<rule_name>.element`
	- `validation.rules.<rule_name>.string`
	- `validation.rules.<rule_name>.numeric`
	- `validation.rules.<rule_name>.array`
	- `validation.rules.<rule_name>.file`
	- `validation.rules.<rule_name>.object`
- Field names defined in `fields.json` are accessed with the `validation.fields` prefix:
	- `validation.fields.<field_name>`

:::info
Entries that do not exist are returned as-is. For example, if you `Get()` a lang entry `validation.rules.nonExisting`, the string returned will be `validation.rules.nonExisting`. 
:::

## Placeholders

Language lines can contain placeholders. Placeholders are identified by a colon directly followed by the placeholder name:

```json
{
	"greetings": "Greetings, :username!"
}

The last parameter of the `Get()` method is a **variadic associative slice** of placeholders and their replacement. In the following example, the placeholder `:username` will be replaced with the `Name` field in the user struct.

```go
language.Get("greetings", ":username", user.Name) // "Greetings, Taylor!"
```

You can provide as many as you want:
```go
language.Get("greetings-with-date", ":username", user.Name, ":day", "Monday") // "Greetings, Taylor! Today is Monday"
```

:::tip
When a placeholder is given, all occurrences are replaced.

```json
{
	"popular": ":product are very popular. :product sales exceeded 1000 last week."
}
```
---
```go
language.Get("popular", ":product", "Lawnmowers")
// "Lawnmowers are very popular. Lawnmowers sales exceeded 1000 last week."
```
:::