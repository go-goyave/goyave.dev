---
title: "Changelog"
description: "The detailed Goyave changelog"
---

# Changelog

:::tip Tip
You can also see the changelog on [Github](https://github.com/go-goyave/goyave/releases). 

You can be notified of new releases by enabling notifications on Github or by joining our [Discord](https://discord.gg/mfemDMc).
:::

[[toc]]

## v5.0.0

### Introduction

**Goyave v5** has been in the oven for over two years. With the first production applications deployed, a ton of issues and flaws revealed themselves, preventing real long-lived projects from cleanly evolving. The initial goals of the framework started to weaken the more the applications were developed and changed: the strong basis it promised to provide wasn't actually that strong. From this invaluable experience, I decided to go back to the drawing board and redesign the framework.

This new major version is an almost entire **rewrite** of the framework.

These release notes will be organized in categories and won't list every single change compared to v4. Instead, they will explain the overall change of direction for each area of the framework as well as shortly showcase the new or improved features.

### Motivations

Among the many aspects that needed to be reworked, some of them stood out and fueled the initial drive to rewrite the framework.

#### Dependency coupling

Every layer and components of a v4 application had **strong dependency coupling**. The HTTP, business and database layers were all mixed up together. The framework was systematically imposing a dependency to itself, direct or indirect. Its locked-up architecture, entirely based on globals was hindering the more business-oriented applications. Those struggled to detach their domains from the rest of the application, and encountered obstacles every time they needed to handle more complex business logic.

For example: to access the database, you were forced to use the framework, which was loaded from a configuration system that also was handled by the framework. This created **a long chain of dependencies** that was hard to separate from the rest, even more so when it came to writing tests.

On top of that, the all-global architecture required a ton of **synchronization**, which were detrimental to the overall performance of the application.

#### Locked architecture

All components of the framework were strongly linked together and quite opaque, despite an initial effort made to make the framework flexible and hackable. In the end, many **non-elegant workarounds** had to be made in real-world scenarios. This made it harder to adapt an application to the constraints often encountered by companies developing their ecosystem and trying to solve real-world issues that needed deeper access to the inner-workings.

The validation system was one of the biggest, if not the biggest, culprit. It was very inconvenient to use compared to the new one brought with v5. The hacks required to make some advanced field comparison or business-logic validation were very fragile and hard to maintain. This design made it impossible to re-use code, and forced the hassle of creating a new validator for every single specific use-case.

The framework was also a bit too reliant on **magic** in some aspects. Many functions were using weak typing (`any`) and **reflection**, or even **string identifiers**, all for the sake of conciseness. But this came at a cost: no compile-time checks, hard code navigation, no completion, the need to rely on documentation all the time, etc. In the end, by trying to be concise for a better DX (developer experience), the framework sacrificed code cleanliness, reliability, readability, maintainability and actually ruined its DX this way.

#### Testing

All these issues accumulate and become a huge pain the moment you start trying to add tests to your project. They were very difficult to write, which is the exact opposite of what you want. Tests should be painless and as easy to read and maintain as possible. Also suffering from the locked architecture and mandatory dependency to the framework, they couldn't even be run in parallel. Almost nothing could be mocked because of the dependency coupling. This was in turn forcing you to use the database for your tests, which made tests even slower and complicated.

In short, the design of the framework prior to v5 treated tests as an after-thought despite how important they are.

#### Streamlining

There were many smaller and non-blocking issues as well. Together they made the entire development flow **awkward** by moments, like there was a missing piece to make the whole process fluid from start to finish.

The first one was the relation between the user-sent data and the internal data. Making use of the data sent by users was inconvenient and also quite unsafe, requiring a ton of type assertions and map navigation. This is very subpar compared to most Go applications which use structures. It also caused problems when interacting with the database.

Another issue was **error handling and debugging**. The framework was relying too much on `panic`, which is not a very sane nor idiomatic way to handle errors. Although it allowed for a pretty good debugging experience for developers with more precise stacktraces, a much better solution was possible. This solution wouldn't compromise on code quality for the sake of DX, again.

The last major one was the low **interoperability and control**, notably with the lack of access over the `context` API, or some missing configuration options and settings.

### Philosophy

The overall philosophy of the framework stays the same. Goyave remains an opinionated framework, focused on DX (developer experience) by enabling quick and enjoyable development by being expressive, reliable and complete. **The goal is to make business logic development as painless as possible by handling as many recurring things for developers as possible so they can focus on implementing what actually creates value for their company.**

#### New direction

However, there are some important evolutions in the general direction of the framework:
- v5 takes architecture and utilities one step further. At first glance, a typical application will be less simple to grasp. Therefore, **the "progessive" nature of the framework is no more.**
- Despite its opinionated nature, the new design tries to be **as open as possible**. The framework should not be a black box and developers should have no trouble making it their own effortlessly.
- The design should focus its efforts on creating tools that **simplify the reduction or elimination of the dependencies** between application layers and business layers.
- The design and development of the framework now assumes full focus on **catering to businesses and medium to large projects**.
- The development of the framework will now consider **real-world use-cases and scenarios** with more importance. No "quick and easy" solutions, tools or fancy gadgets will be developed from now on.
- The framework and documentation will expand even more on **architecture recommendations and good practices** to cover more questions developers could have when working on their project. The goal of an opinionated framework is to save time to its users, while giving them all the tools they need to do produce the best possible quality software.
- The open-source process has been revised to make contributions easier. Gathering and taking care of **a strong community** has always been very important. More efforts will be made in this direction.

### Architecture

### Server

### Configuration

### Routing

### Requests

### Responses

### Validation

### Error handling

### Authentication

### Database

### Localization

- `request.Lang` is now a `*lang.Language` instead of a `string`.

### Logging

### Request parsing

### Compression

### File systems

### Tests

### Structure conversion and mapping

### Raw data exploration

Raw data exploration using the `goyave.dev/goyave/v5/util/walk` package has received **minor changes**:
- `*Path.Name` is now a `*string` instead of `string` to better handle elements that don't have a name (such as array elements).
- Paths can now explore array root elements (paths such as `[]` or `[].field`).
- `walk.Path.Walk()` callback now receives a `*walk.Context` instead of `walk.Context`
- `walk.Path.First()` new method returns the `*walk.Context` for the first final element that matches the path.   
- `walk.Path.Depth()` new method returns the depth of the path.   
- `walk.Path.Truncate()` new method returns a clone of the n first steps of the path so the returned path's depth equals the given depth.
- `*walk.Path` now implements a `String()` methods that returns a string representation of the path.
- `walk.Context`'s new method `Break()` indicates the walker to stop early.
- `walk.MustParse()` new function returns a `*walk.Path` or panics if there is an error.

### Websocket

### Filters

### Miscellaneous

- Minimum Go version will always be the second-to-latest version. At the time of release, this is 1.21.
- The template project has been simplified as much as possible to removed all the unnecessary code. When you start a project, the first thing you do shouldn't be to remove things you don't need.
- The `util/reflectutil` package was removed.
- The `util/sliceutil` package was removed. Use [`samber/lo`](https://github.com/samber/lo) instead.
- `util/typeutil`'s functions `ToFloat64()` and `ToString()` were removed.
- `goyave.EnableMaintenance()`, `goyave.DisableMaintenance()` and `goyave.IsMaintenanceEnabled()` were removed.