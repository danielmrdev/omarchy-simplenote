function createRouter(getOwner, summon) {
  var router = {
    editorRequested: false,
    open: function() {
      var owner = getOwner()
      if (owner) {
        owner.openEditor()
        return "ok"
      }
      router.editorRequested = true
      try {
        return summon() ? "ok" : "no-live-bar-widget"
      } finally {
        router.editorRequested = false
      }
    },
    toggle: function() {
      var owner = getOwner()
      if (owner) {
        owner.closeEditor()
        return "ok"
      }
      return router.open()
    }
  }
  return router
}

if (typeof module !== "undefined") module.exports = { createRouter: createRouter }
