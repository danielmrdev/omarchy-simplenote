const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { createRouter, selectScreen, noteShortcut } = require("../Shortcut.js")

test("note shortcut reports active matching bindings and ignores unrelated keys", () => {
  assert.equal(noteShortcut([{ description: "Simple Note", key: "N", modmask: 76 }]), "Ctrl+Alt+Super+N")
  assert.equal(noteShortcut([{ arg: "omarchy-shell danielmrdev.simplenote.editor toggle", key: "Q", modmask: 65 }]), "Super+Shift+Q")
  assert.equal(noteShortcut([{ description: "Other", key: "N", modmask: 76 }]), "")
  assert.equal(noteShortcut(null), "")
})

test("open and toggle address the same service-owned editor without a bar", () => {
  let visible = false
  let opens = 0
  let closes = 0
  const router = createRouter(() => visible, () => { visible = true; opens++ },
    () => { visible = false; closes++ })
  assert.equal(router.open(), "ok")
  assert.equal(router.open(), "ok")
  assert.equal(opens, 2)
  assert.equal(router.toggle(), "ok")
  assert.equal(closes, 1)
  assert.equal(router.toggle(), "ok")
  assert.equal(opens, 3)
})

test("screen selection uses the focused monitor with a safe fallback", () => {
  const screens = [{ name: "one" }, { name: "two" }]
  assert.equal(selectScreen(screens, "two"), screens[1])
  assert.equal(selectScreen(screens, "missing"), screens[0])
  assert.equal(selectScreen([], "one"), null)
})

test("the enabled service owns IPC and the single editor; the reader uses it", () => {
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8")
  const service = read("Service.qml")
  const panel = read("NotePanel.qml")
  const manifest = JSON.parse(read("manifest.json"))
  assert.equal(manifest.entryPoints.service, "Service.qml")
  assert.match(service, /target:\s*"danielmrdev\.simplenote\.editor"/)
  assert.match(service, /function open\(\): string \{ return root\.shortcutRouter\.open\(\) \}/)
  assert.match(service, /function toggle\(\): string \{ return root\.shortcutRouter\.toggle\(\) \}/)
  assert.equal((service.match(/\bEditor\s*\{/g) || []).length, 1)
  assert.match(panel, /service\.openEditor\(\)/)
  assert.doesNotMatch(service, /shell\.summon|findPanelWidget/)
})

test("the editor connects its always-enabled focus scope to the close route", () => {
  const source = fs.readFileSync(path.join(__dirname, "../Editor.qml"), "utf8")
  assert.match(source, /EditorFocus\s*\{[\s\S]*?onEscapeRequested:\s*root\.closeEditor\(\)/)
  assert.match(source, /keyScope\.forceActiveFocus\(\)/)
})
