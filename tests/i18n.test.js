const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const i18n = require("../i18n.js")

test("English and Spanish have matching non-empty catalogs", () => {
  assert.deepEqual(Object.keys(i18n.en).sort(), Object.keys(i18n.es).sort())
  for (const key of Object.keys(i18n.en)) {
    assert.ok(i18n.en[key])
    assert.ok(i18n.es[key])
  }
})

test("Spanish locale variants and English fallback", () => {
  for (const locale of ["es", "es_ES.UTF-8", "es-ES"]) {
    assert.equal(i18n.t("empty", locale), i18n.es.empty)
  }
  assert.equal(i18n.t("empty", "fr-FR"), i18n.en.empty)
  assert.equal(i18n.t("missing", "es"), "missing")
})

test("size error states the UTF-8 limit and recovery action in both languages", () => {
  assert.match(i18n.t("noteTooLarge", "en"), /1 MiB.*1,048,576 UTF-8 bytes/)
  assert.match(i18n.t("noteTooLarge", "en"), /Reduce.*back up.*retry/)
  assert.match(i18n.t("noteTooLarge", "es"), /1 MiB.*1\.048\.576 bytes UTF-8/)
  assert.match(i18n.t("noteTooLarge", "es"), /Reduce.*copia de seguridad.*reinténtalo/)
  for (const name of ["Editor.qml", "NotePanel.qml"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", name), "utf8")
    assert.match(source, /errorReason === "note_too_large".*tr\("noteTooLarge"\)/)
  }
})

test("the widget binds language to Omarchy rather than the system locale", () => {
  const source = fs.readFileSync(path.join(__dirname, "../BarWidget.qml"), "utf8")
  assert.match(source, /readonly property string localeName:\s*I18n\.language/)
  assert.doesNotMatch(source, /Qt\.locale\(\)/)
})
