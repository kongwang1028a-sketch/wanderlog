import assert from "node:assert/strict"
import { EDITOR_ACCESS_TOKEN, editorToken, SITE_ACCESS_TOKEN } from "./site-access"

assert.equal(EDITOR_ACCESS_TOKEN.length, 64)
assert.notEqual(EDITOR_ACCESS_TOKEN, SITE_ACCESS_TOKEN)
assert.match(EDITOR_ACCESS_TOKEN, /^[0-9a-f]{64}$/)

async function main() {
  const sample = await editorToken("not-the-editor-password")
  assert.equal(sample.length, 64)
  assert.notEqual(sample, EDITOR_ACCESS_TOKEN)
  assert.notEqual(sample, SITE_ACCESS_TOKEN)
  console.log("site-access ok")
}

void main()
