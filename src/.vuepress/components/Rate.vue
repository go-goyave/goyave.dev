<template>
    <div>
      <h2>Rate limiting</h2>
      <p>Rate limiting is a crucial part of public API development. If you want to protect your data from being crawled, protect yourself from DDOS attacks, or provide different tiers of access to your API, you can do it using Goyave's built-in rate limiting middleware.</p>
      <p>This middleware uses either a client's IP or an authenticated client's ID (or any other way of identifying a client you may need) and maps a quota, a quota duration and a request count to it. If a client exceeds the request quota in the given quota duration, this middleware will block and return HTTP 429 Too Many Requests.</p>
      <p>The middleware will always add the following headers to the response:</p>
      <ul>
        <li>RateLimit-Limit: containing the requests quota in the time window</li>
        <li>RateLimit-Remaining: containing the remaining requests quota in the current window</li>
        <li>RateLimit-Reset: containing the time remaining in the current window, specified in seconds</li>
      </ul>

      <pre>
        <code>
          import "goyave.dev/goyave/v3/middleware/ratelimiter"

          ratelimiterMiddleware := ratelimiter.New(func(request *goyave.Request) ratelimiter.Config {
              return ratelimiter.Config {
                  RequestQuota:  100,
                  QuotaDuration: time.Minute,
                  // 100 requests per minute allowed
                  // Client IP will be used as identifier
              }
          })

          router.Middleware(ratelimiterMiddleware)
        </code>
      </pre>
      
    <p>Learn more about rate limiting in the <a href="https://goyave.dev/guide/advanced/rate-limiting.html">documentation</a>.</p>
    </div>
</template>

<script>
export default {
  name: "Rate",
}
</script>

<style lang="stylus">
</style>