function selectScreen(screens, focusedName) {
  for (var i = 0; i < screens.length; i++)
    if (screens[i].name === focusedName) return screens[i]
  return screens.length ? screens[0] : null
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

if (typeof module !== "undefined") module.exports = { createRouter: createRouter, selectScreen: selectScreen }
