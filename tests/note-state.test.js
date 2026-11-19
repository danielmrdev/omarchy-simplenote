const test = require("node:test")
const assert = require("node:assert/strict")
const { createNoteState } = require("../NoteState.js")

function fixture(initial = "") {
  const requests = []
  const state = createNoteState(request => requests.push(request))
  state.load()
  requests.shift().complete({ status: "ok", text: initial, revision: "initial" })
  return { state, requests }
}

test("edits are saved only after a flush acknowledges the snapshot", () => {
  const { state, requests } = fixture("old")
  state.edit("new")
  assert.equal(state.dirty, true)
  assert.equal(requests.length, 0)
  state.flush()
  assert.deepEqual(
    { text: requests[0].text, revision: requests[0].revision },
    { text: "new", revision: "initial" }
  )
  assert.equal(state.dirty, true)
  requests.shift().complete({ status: "ok", revision: "next" })
  assert.equal(state.dirty, false)
})

test("close flushes immediately and a later edit survives an older acknowledgement", () => {
  const { state, requests } = fixture()
  state.edit("first")
  state.close()
  state.edit("second")
  state.flush()
  requests.shift().complete({ status: "ok", revision: "one" })
  assert.equal(state.text, "second")
  assert.equal(state.dirty, true)
  assert.equal(requests[0].text, "second")
  assert.equal(requests[0].revision, "one")
  requests.shift().complete({ status: "ok", revision: "two" })
  assert.equal(state.dirty, false)
})

test("write failure retains text and requires explicit retry", () => {
  const { state, requests } = fixture()
  state.edit("unsaved")
  state.flush()
  requests.shift().complete({ status: "error" })
  assert.equal(state.error, true)
  assert.equal(state.text, "unsaved")
  assert.equal(state.dirty, true)
  state.flush()
  assert.equal(requests.length, 0)
  state.retry()
  assert.equal(requests.shift().text, "unsaved")
})

test("recovery limit is visible, retains pending text, and clears on retry", () => {
  const { state, requests } = fixture()
  state.edit("unsaved")
  state.flush()
  requests.shift().complete({ status: "error", reason: "recovery_limit" })
  assert.equal(state.errorReason, "recovery_limit")
  assert.equal(state.text, "unsaved")
  assert.equal(state.dirty, true)
  state.flush()
  assert.equal(requests.length, 0)
  state.retry()
  assert.equal(state.errorReason, "")
  requests.shift().complete({ status: "ok", revision: "new" })
  assert.equal(state.dirty, false)
})

test("conflicting disk revision blocks automatic saves without losing local text", () => {
  const { state, requests } = fixture("disk")
  state.edit("local")
  state.flush()
  requests.shift().complete({ status: "conflict" })
  assert.equal(state.conflict, true)
  assert.equal(state.text, "local")
  state.edit("more local")
  state.retry()
  assert.equal(requests.length, 0)
})

test("load failure does not permit a write against an unknown revision", () => {
  const requests = []
  const state = createNoteState(request => requests.push(request))
  state.load()
  requests.shift().complete({ status: "error" })
  state.edit("keep me")
  state.flush()
  assert.equal(requests.length, 0)
  assert.equal(state.text, "keep me")
  assert.equal(state.error, true)
})

test("an edit made before the first read is never overwritten by the read", () => {
  const requests = []
  const state = createNoteState(request => requests.push(request))
  state.load()
  state.edit("local")
  requests.shift().complete({ status: "ok", text: "external", revision: "r" })
  assert.equal(state.text, "local")
  assert.equal(state.conflict, true)
  assert.equal(requests.length, 0)
})

test("duplicate stale read completions cannot interrupt a newer write", () => {
  const requests = []
  const state = createNoteState(request => requests.push(request))
  state.load()
  const read = requests.shift()
  read.complete({ status: "ok", text: "old", revision: "one" })
  state.edit("new")
  state.flush()
  read.complete({ status: "error" })
  assert.equal(state.error, false)
  requests.shift().complete({ status: "ok", revision: "two" })
  assert.equal(state.dirty, false)
})
