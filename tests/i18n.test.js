const test = require("node:test")
const assert = require("node:assert/strict")
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
