import assert from "node:assert/strict"
import { publicShareUrl } from "./share-url"

assert.equal(
  publicShareUrl("https://kongwang1028a-sketch.github.io/wanderlog"),
  "https://kongwang1028a-sketch.github.io/wanderlog/",
)
assert.equal(
  publicShareUrl("https://kongwang1028a-sketch.github.io/wanderlog/"),
  "https://kongwang1028a-sketch.github.io/wanderlog/",
)
assert.equal(
  publicShareUrl("https://kongwang1028a-sketch.github.io/wanderlog/?from=share#map"),
  "https://kongwang1028a-sketch.github.io/wanderlog/",
)
assert.equal(publicShareUrl("http://127.0.0.1:43123/"), "http://127.0.0.1:43123")
assert.equal(publicShareUrl("http://127.0.0.1:43123"), "http://127.0.0.1:43123")

console.log("share-url ok")
