---
outline: deep
---

# Runtime API Examples

This page demonstrates usage of some of the runtime APIs provided by VitePress.

The main `useData()` API can be used to access site, theme, and page data for the current page. It works in both `.md` and `.vue` files:

```go
router.Route("GET", "/hello", func(response *goyave.Response, r *goyave.Request) {
    response.String(http.StatusOK, "Hi!")
})
```

[`code with link`](https://goyave.dev)  
[link](https://goyave.dev)

::: info Note
Please feel free to sudgest changes, ask for more details, report grammar errors, or notice of uncovered scenarios by [creating an issue](https://github.com/go-goyave/goyave/issues/new/choose) with the proposal template. `code snippet`.

[`code with link`](https://goyave.dev)  
[link](https://goyave.dev)

```go
router.Route("GET", "/hello", func(response *goyave.Response, r *goyave.Request) {
    response.String(http.StatusOK, "Hi!")
})
```
:::

::: tip Note
Please feel free to sudgest changes, ask for more details, report grammar errors, or notice of uncovered scenarios by [creating an issue](https://github.com/go-goyave/goyave/issues/new/choose) with the proposal template. `code snippet`.

[`code with link`](https://goyave.dev)  
[link](https://goyave.dev)

```go
router.Route("GET", "/hello", func(response *goyave.Response, r *goyave.Request) {
    response.String(http.StatusOK, "Hi!")
})
```
:::

::: warning Note
Please feel free to sudgest changes, ask for more details, report grammar errors, or notice of uncovered scenarios by [creating an issue](https://github.com/go-goyave/goyave/issues/new/choose) with the proposal template. `code snippet`.

[`code with link`](https://goyave.dev)  
[link](https://goyave.dev)

```go
router.Route("GET", "/hello", func(response *goyave.Response, r *goyave.Request) {
    response.String(http.StatusOK, "Hi!")
})
```
:::

::: danger Note
Please feel free to sudgest changes, ask for more details, report grammar errors, or notice of uncovered scenarios by [creating an issue](https://github.com/go-goyave/goyave/issues/new/choose) with the proposal template. `code snippet`.

[`code with link`](https://goyave.dev)  
[link](https://goyave.dev)

```go
router.Route("GET", "/hello", func(response *goyave.Response, r *goyave.Request) {
    response.String(http.StatusOK, "Hi!")
})
```
:::


<Badge type="info" text="badge" />
<Badge type="tip" text="badge" />
<Badge type="warning" text="badge" />
<Badge type="danger" text="badge" />
<Badge type="brand" text="badge" />

:::mono
.
├── database
│   ├── model
│   |   └── *...*
│   └── seeder
│       └── *...*
├── http
│   ├── controller
│   │   └── *...*
│   ├── middleware
│   │   └── *...*
│   ├── validation (*optional*)
│   │   ├── placeholder.go (*optional*)
│   │   └── validation.go (*optional*)
│   └── route
│       └── route.go
│
├── resources
│   ├── lang
│   │   └── en-US (*language name*)
│   │       ├── fields.json (*optional*)
│   │       ├── locale.json (*optional*)
│   │       └── rules.json (*optional*)
│   ├── img (*optional*)
│   │   └── *...*
|   └── template (*optional*)
|       └── *...*
│
├── test
|   └── *...*
|
├── .gitignore
├── config.json
├── go.mod
└── main.go
:::

```md
<script setup>
import { useData } from 'vitepress'

const { theme, page, frontmatter } = useData()
</script>

## Results

### Theme Data
<pre>{{ theme }}</pre>

### Page Data
<pre>{{ page }}</pre>

### Page Frontmatter
<pre>{{ frontmatter }}</pre>
```

<script setup>
import { useData } from 'vitepress'

const { site, theme, page, frontmatter } = useData()
</script>

## Results

### Theme Data
<pre>{{ theme }}</pre>

### Page Data
<pre>{{ page }}</pre>

### Page Frontmatter
<pre>{{ frontmatter }}</pre>

## More

Check out the documentation for the [full list of runtime APIs](https://vitepress.dev/reference/runtime-api#usedata).
