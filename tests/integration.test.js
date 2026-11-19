// A controlled host fixture, not a QML or Omarchy runtime test.
const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { createNoteState } = require("../NoteState.js")
const { createRouter, selectScreen } = require("../Shortcut.js")
const { t } = require("../i18n.js")

const root = path.join(__dirname, "..")
function host() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simplenote-integration-"))
  const note = path.join(dir, "omarchy-simplenote", "note.txt")
  const queue = []
  let failWrite = false
  let opened = false
  const state = createNoteState(request => queue.push(request))
  const router = createRouter(() => opened, () => { opened = true },
    () => { opened = false; state.flush() })
  function drain() {
    while (queue.length) {
      const request = queue.shift()
      if (failWrite && request.type === "write") {
        failWrite = false
        request.complete({ status: "error" })
        continue
      }
      const result = spawnSync("python3", [path.join(root, "storage.py")], {
        env: { ...process.env, XDG_CONFIG_HOME: dir },
        input: JSON.stringify(request) + "\n", encoding: "utf8"
      })
      assert.equal(result.status, 0, result.stderr)
      request.complete(JSON.parse(result.stdout))
    }
  }
  return {
    state, router, drain, note, queue,
    failNextWrite: () => { failWrite = true },
    isOpen: () => opened,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  }
}

test("service fixture connects bar-free toggle, close flush, persistence and lifecycle", tcase => {
  const h = host()
  tcase.after(h.cleanup)
  h.state.load(); h.drain()
  assert.equal(h.state.text, "")
  assert.equal(h.router.toggle(), "ok")
  assert.equal(h.isOpen(), true)
  assert.equal(selectScreen([{ name: "DP-3" }], "DP-3").name, "DP-3")
  h.state.edit("plain <text>\nsecond line")
  h.router.toggle()
  assert.equal(h.isOpen(), false)
  assert.equal(h.state.dirty, true)
  h.drain()
  assert.equal(fs.readFileSync(h.note, "utf8"), "plain <text>\nsecond line")
  assert.equal(h.state.dirty, false)
  h.state.dispose()
  const after = []
  const restarted = createNoteState(op => after.push(op))
  restarted.load()
  const read = spawnSync("python3", [path.join(root, "storage.py")], {
    env: { ...process.env, XDG_CONFIG_HOME: path.dirname(path.dirname(h.note)) },
    input: JSON.stringify(after[0]) + "\n", encoding: "utf8"
  })
  assert.equal(read.status, 0)
  after.shift().complete(JSON.parse(read.stdout))
  assert.equal(restarted.text, "plain <text>\nsecond line")
})

for (const choice of ["local", "external"]) {
  test(`real storage conflict, ${choice} resolution, and retry after error`, tcase => {
    const h = host()
    tcase.after(h.cleanup)
    h.state.load(); h.drain()
    h.state.edit("first"); h.state.flush(); h.drain()
    h.state.edit("local")
    fs.writeFileSync(h.note, "external")
    h.state.refresh(); h.drain()
    assert.equal(h.state.conflict, true)
    assert.equal(h.state.text, "local")
    assert.equal(h.state.externalText, "external")
    h.state.resolve(choice); h.drain()
    assert.equal(h.state.conflict, false)
    assert.equal(h.state.text, choice)
    assert.equal(fs.readFileSync(h.note, "utf8"), choice)
    h.state.edit("retained")
    h.failNextWrite()
    h.state.flush(); h.drain()
    assert.equal(h.state.error, true)
    assert.equal(h.state.text, "retained")
    h.state.retry(); h.drain()
    assert.equal(h.state.error, false)
    assert.equal(fs.readFileSync(h.note, "utf8"), "retained")
  })
}

test("QML wiring connects shared state, controls, locales and lifecycle", () => {
  const read = name => fs.readFileSync(path.join(root, name), "utf8")
  const widget = read("BarWidget.qml"), panel = read("NotePanel.qml")
  const editor = read("Editor.qml"), service = read("Service.qml")
  assert.match(widget, /service:\s*root\.noteService/)
  assert.match(widget, /onPressed:\s*root\.togglePanel\(\)/)
  assert.match(panel, /service\.openEditor\(\)/)
  assert.match(editor, /onTextEdited:.*service\.edit\(text\)/)
  assert.match(editor, /if \(service\) service\.flush\(\)/)
  assert.match(editor, /Keys\.onEscapePressed:.*root\.closeEditor\(\)/)
  assert.match(service, /Component\.onDestruction:.*machine\.dispose\(\)/)
  assert.match(service, /target:\s*"danielmrdev\.simplenote\.editor"/)
  for (const source of [panel, editor]) {
    for (const action of ["retry", "resolve\\(\"local\"\\)", "resolve\\(\"external\"\\)"]) {
      assert.match(source, new RegExp("service\\." + action))
    }
  }
  for (const key of ["note", "empty", "edit", "close", "error", "retry", "conflict", "keepLocal", "loadExternal", "about"]) {
    assert.notEqual(t(key, "en"), key)
    assert.notEqual(t(key, "es"), key)
    assert.notEqual(t(key, "en"), t(key, "es"))
  }
})
