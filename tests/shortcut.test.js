const test = require("node:test")
const assert = require("node:assert/strict")
const { createRouter } = require("../Shortcut.js")

test("open routes to the active widget and reopens the same editor", () => {
  let owner = null
  let opens = 0
  const router = createRouter(() => owner, () => {
    assert.equal(router.editorRequested, true)
    owner = { openEditor() { opens++ }, closeEditor() { owner = null } }
    owner.openEditor()
    return true
  })
  assert.equal(router.open(), "ok")
  assert.equal(router.open(), "ok")
  assert.equal(opens, 2)
  assert.equal(router.editorRequested, false)
})

test("toggle closes the existing editor or opens one", () => {
  let owner = null
  const router = createRouter(() => owner, () => {
    owner = { closeEditor() { owner = null } }
    return true
  })
  assert.equal(router.toggle(), "ok")
  assert.ok(owner)
  assert.equal(router.toggle(), "ok")
  assert.equal(owner, null)
})

test("bar-free operation reports the host limitation and clears the request", () => {
  const router = createRouter(() => null, () => false)
  assert.equal(router.open(), "no-live-bar-widget")
  assert.equal(router.editorRequested, false)
  assert.equal(router.toggle(), "no-live-bar-widget")
})
