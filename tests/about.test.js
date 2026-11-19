const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const i18n = require("../i18n.js")
const panel = fs.readFileSync(path.join(__dirname, "../NotePanel.qml"), "utf8")
const manifest = require("../manifest.json")

test("About and note share a keyboard-accessible navigation control", () => {
  assert.match(panel, /property bool showingAbout: false/)
  assert.match(panel, /showingAbout = !showingAbout/)
  assert.match(panel, /text: root\.showingAbout \? root\.tr\("note"\) : "v" \+ root\.pluginVersion/)
  assert.match(panel, /visible: !root\.showingAbout/)
  assert.match(panel, /visible: root\.showingAbout/)
  assert.match(panel, /aboutToggle\.forceActiveFocus\(\)/)
})

test("About version matches the manifest and copy is localized", () => {
  assert.match(panel, new RegExp(`readonly property string pluginVersion: "${manifest.version.replaceAll(".", "\\.")}"`))
  for (const key of ["about", "aboutInfo", "aboutDescription", "aboutPrivacy"]) {
    assert.ok(i18n.en[key])
    assert.ok(i18n.es[key])
    assert.equal(i18n.t(key, "es-ES"), i18n.es[key])
    assert.match(panel, new RegExp(`root\\.tr\\("${key}"\\)`))
  }
})
