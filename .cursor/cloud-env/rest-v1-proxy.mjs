import http from "node:http"

const TARGET_PORT = Number(process.env.PGRST_HOST_PORT ?? 54323)
const LISTEN_PORT = Number(process.env.API_PROXY_PORT ?? 54321)

http
  .createServer((req, res) => {
    const incoming = req.url ?? "/"
    const stripped = incoming.replace(/^\/rest\/v1(?=\/|$)/, "") || "/"
    const proxy = http.request(
      {
        hostname: "127.0.0.1",
        port: TARGET_PORT,
        path: stripped,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${TARGET_PORT}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers)
        upstream.pipe(res)
      },
    )
    proxy.on("error", (err) => {
      res.writeHead(502, { "content-type": "text/plain" })
      res.end(`rest-v1-proxy: ${err.message}`)
    })
    req.pipe(proxy)
  })
  .listen(LISTEN_PORT, "127.0.0.1", () => {
    console.log(
      `rest-v1-proxy listening on 127.0.0.1:${LISTEN_PORT} -> 127.0.0.1:${TARGET_PORT}`,
    )
  })
