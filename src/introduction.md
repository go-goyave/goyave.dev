---
title: "Introduction"
description: "Introduction description"
---

# Introduction

**Goyave** an **opinionated** all-in-one Golang web framework focused on **REST APIs**, with emphasis on code **reliability**, **maintainability** and **developer experience** (DX).

In short, Goyave's **goals** are:
- Catering to companies with enterprise-level clean architecture, for medium to large projects
- Help developers focus on the business logic of their application instead of spending time on technical aspects
- Provide an all-in-one package with no setup friction
- Provide all the features a typical project needs without bloating or magic
- Provide an optimal setup for the real-world
- Ensure robust, reliable and resilient code 
- Stay open and hackable despite being opinionated
- Make backend development easy and enjoyable
- Keep a clear and extensive documentation so developers can always find the answer to their questions

Goyave's **non-goals** are:
- Hyper-optimisation and performance
- Small projects and prototypes
- Providing control on low-level networking
- Providing tools for front-end development

---

If you feel like the above description fits your needs, **welcome**! This website contains the **documentation** and **guides** on how to use the framework to its fullest, so you can start creating value for your business.

Before that, let's talk a bit about the motivations and the decisions behind the creation of the framework. If you are not interested, feel free to skip to the [installation](/getting-started/installation.html) documentation.

## Why was Goyave created

The story starts in 2019, in a company working with many web services, both internal and exposed to the internet. All those services were using a lot of copy-pasted boilerplate and a very questionable architecture, with a bunch of modules quickly taped together, resulting in an infrastructure entirely flawed, unreliable, and difficult to maintain. No technical decision or work had dedicated time. Developers only had time allocated for business implementation, and never for actually building good tech.

At the time, I (the author of the framework), took the initiative and started working on a re-usable basis for future project in my free time. I looked for complete all-in-one Go packages that we could use right away and start building. It turns out that, at the time, no fully-featured Go framework that were focused on REST APIs existed. So I started working on a creating a robust set of libraries correctly interfaced together, so they would work seemlessly.

After some time, I came up with a simple and light framework with a recommended architecture and presented it to the team. Always short on time, the technical leads didn't even check nor consider integrating it into our projects. I left the company soon after and continued working on my project. I was allowed to do this because my code wasn't company property: I worked on this in my free time, on my own, and I wasn't directed to do it. I committed myself to create tools that would help future developers and entrepreneurs not encounter the same issues so they could lead their business forward with confidence, while saving time on the more technical topics any team inevitably encounters. I published the project on Github under the name Goyave.

The framework was very rudimentary at the time, and flawed in many ways. With time, I kept improving it. I starting replacing libraries the framework was depending on with my custom implementations, which allowed for even better compatibility between the modules. It opened a ton of new possibilities that were just not possible when working with various libraries that were all designed differently and separately. 

It didn't take too long before some companies noticed the project while making research for their new applications. Again, Goyave was the only option plugging this hole in the ecosystem at the time.
I am delighted with the idea of sharing my skills, knowledge and passion so we can all build better software together. Enabling businesses to create value and reach success is my own view of success. I am not done though. Getting companies to work with the framework brought me a ton of feedback and very valuable experience that helped me shape the framework that is Goyave today. 

## Why using an all-in-one opinionated framework

Using a fully-featured framework provides several advantages over assembling your project with a wide range of libraries yourself:
- **Save time**
    - **Setting up your project** takes a few seconds only. Setting up a project from scratch, looking for libraries that fit your needs and make them interoperate seemlessly together can take a week, or more.
    - All the **architecture issues and questions** are already solved for you. No need to think about how you will decouple your layers, how you will handle business transactions, etc. Just follow the guidelines and the tools provided by the framework and you will be good to go.
    - An entire **extensive documentation** is ready. You won't have to document yourself how all the basic modules of your application work and what they can do. You won't have to document the architecture and directory structure neither.
    - Thanks to this documentation, it's easier to **onboard** new developers. Some of them may already know the framework and feel right at home in your project despite not knowing a thing about it yet.
- **Reliability**
    - The framework is widely used and **extensively tested**. It is less likely that your core system contain bugs than if you implemented them yourself.
    - The framework adds safeguards to ensure that your application still behaves correctly even if something goes wrong. It provides many ways to **handle errors gracefully** with little to no effort.
    - All you have to worry about is your business logic. This leads to **less pressure on the developers**, and helps them keep their peace of mind.
- **Abstraction**
    - Behind the curtains, the framework is doing a lot for you. Building your application on top of it guarantees compliance with standards. It makes it more consistent. It reduces the amount of small details your team has to think about. For example, you know that the user input will always have the correct type thanks to the validation system. You won't have to convert it yourself anymore. 

## Why is DX important

Good developer experience (DX) is very important. Developers will produce more robust and reliable code if they master their development environment by knowning clearly how it works with minimal cognitive load. The more pleasant it is to work on a project, the better its quality will be. And this will be reflected on the quality of the product or service your business is providing.

It has been shown countless times that a happy developer is a productive developer. A happy developer is also one that will happily write clean and maintainable code, entirely tested, because it is not a slog to do that.

Goyave will help them reach this by providing the necessary tools and enabling your project's to be easily extended to solve your company's unique challenges. 

## Sponsors and donators

- Ben Hyrman
- Massimiliano Bertinetti
- ethicnology
- Yariya
- sebastien-d-me
- Nebojša Koturović

## Contributors

A big "Thank you" to the Goyave contributors:

- [Kuinox](https://github.com/Kuinox) (Powershell install script)
- [Alexandre GV.](https://github.com/alexandregv) (Install script MacOS compatibility)
- [jRimbault](https://github.com/jRimbault) (CI and code analysis)
- [Guillermo Galvan](https://github.com/gmgalvan) (Request extra data)
- [Albert Shirima](https://github.com/agbaraka) (Rate limiting and various contributions)
- [Łukasz Sowa](https://github.com/Morishiri) (Custom claims in JWT)
- [Zao SOULA](https://github.com/zaosoula) (Custom GORM.Config{} in config file)
- [Ajtene Kurtaliqi](https://github.com/akurtaliqi) (Documentation landing page)
- [Louis Laurent](https://github.com/ulphidius) ([`gyv`](https://github.com/go-goyave/gyv) productivity CLI)
- [Clement3](https://github.com/Clement3) (`search` feature on [`goyave.dev/filter`](https://github.com/go-goyave/filter))
- [Darkweak](https://github.com/darkweak) (`HTTP cache, RFC compliant` middleware based on [Souin HTTP cache system](https://github.com/darkweak/souin))
- [Jason C Keller](https://github.com/imuni4fun) (Testify interface compatibility)


## Goyave in production

These companies already use Goyave in production:

<div class="used-by">
    <a href="https://adagio.io" target="_blank" rel="nofollow">
        <img src="/usedby/adagio.webp" width="100" height="90" alt="Adagio.io" style="background-color: #fff"/>
    </a>
</div>

Do you want to be featured here? [Open a Pull Request](https://github.com/go-goyave/goyave.dev/pulls).

## Discord

Come and learn about the framework, stay updated on the progress, be notified when there is a new release, get help, suggest new features or changes, contribute to the project, and more!

<p align="center">
  <a href="https://discord.gg/mfemDMc">
    <img src="https://discord.com/api/guilds/744264895209537617/widget.png?style=banner2" alt="Discord">
  </a>
</p>
