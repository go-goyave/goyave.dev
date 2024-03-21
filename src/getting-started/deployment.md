---
title: "Deployment"
description: "This guide covers the important things to know before deploying a Goyave application"
---

# Deployment

[[toc]]

## Introduction

There are some important details to think about before deploying your Goyave application to production. We are going to cover them in this section of the guide, and make sure your applications are deployed properly.

## Application configuration


- Loading the configuration:
	- **If you are using configuration automatic loading**, make sure to deploy your application with a `config.production.json` config file containing the correct values for your production environment and **set the `GOYAVE_ENV` environment variable to `production`.**
	- If you are loading your configuration manually, make sure the file that should be loaded is included next to your executable.
	- If you are using an `embed`, make sure you are adding the necessary **build flags** to you `go build` command.
- Ensure that the `app.environment` entry is `production`.
- The `server.host` entry should be `0.0.0.0` if you want to open access to your service from anywhere. If you're using Apache or Nginx as a proxy on the same machine, keep it at `127.0.0.1` so the server will only be accessible through the proxy.
- If you are using a proxy, update the `server.proxy` section so generates URLs and redirects will aim at the proxy rather than your application. 
- Change the `server.domain` entry to your domain name, if you use one.
- Update the `server.port`.
- `server.debug` **must** be set do `false` so your application outputs JSON structured logs rather than human-readable logs and error messages won't be added to responses.
- Change your database connection credentials.

## Build

Of course, don't run your application with `go run` in production. Build your application using `go build` and deploy the executable, alongside the config files and resources directory.

The following Dockerfile is an example of a goyave application called `docker-goyave`:
```Dockerfile
FROM golang:alpine as builder

WORKDIR /app

COPY . .

# Add "-tags production" if you are using embedded configuration
RUN go build -ldflags "-w -s"

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/docker-goyave ./docker-goyave

# Not needed if you are using embed resources
COPY resources /app/resources 

# Not needed if you are using embed configuration
COPY config.production.json ./config.production.json

RUN useradd -r -U go-exec -M -d /app -s /bin/false
RUN chown -R go-exec /app

USER go-exec

EXPOSE 80
ENV GOYAVE_ENV=production

ENTRYPOINT [ "./docker-goyave" ]
```
