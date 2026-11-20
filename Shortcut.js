function selectScreen(screens, focusedName) {
  for (var i = 0; i < screens.length; i++)
    if (screens[i].name === focusedName) return screens[i]
  return screens.length ? screens[0] : null
}

function noteShortcut(bindings) {
  if (!Array.isArray(bindings)) return ""
  for (var i = 0; i < bindings.length; i++) {
    var binding = bindings[i]
    if (!binding || !binding.key || binding.mouse || binding.release) continue
    var description = String(binding.description || "")
    var argument = String(binding.arg || "")
    if (description !== "Simple Note" &&
        !/omarchy-shell\s+danielmrdev\.simplenote\.editor\s+(?:open|toggle)\b/.test(argument)) continue
    var mask = Number(binding.modmask) || 0
    var parts = []
    if (mask & 4) parts.push("Ctrl")
    if (mask & 8) parts.push("Alt")
    if (mask & 64) parts.push("Super")
    if (mask & 1) parts.push("Shift")
    if (mask & ~(4 | 8 | 64 | 1)) continue
    parts.push(String(binding.key).toUpperCase())
    return parts.join("+")
  }
  return ""
}

function createRouter(isOpen, openEditor, closeEditor) {
  return {
    open: function() {
      openEditor()
      return "ok"
    },
    toggle: function() {
      if (isOpen()) closeEditor()
      else openEditor()
      return "ok"
    }
  }
}

if (typeof module !== "undefined") module.exports = { createRouter: createRouter, selectScreen: selectScreen, noteShortcut: noteShortcut }
