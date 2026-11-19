// Pure state machine. The host owns scheduling and the storage adapter.
// A successful write must mean that the adapter has durably acknowledged
// the exact snapshot and checked the supplied revision for conflicts.
function createNoteState(dispatch) {
  var state = {
    text: "",
    dirty: false,
    error: false,
    errorReason: "",
    conflict: false,
    loaded: false,
    revision: null
  }
  var busy = false
  var flushRequested = false
  var generation = 0
  var externalRevision = null
  var disposed = false

  state.dispose = function() { disposed = true }

  function read(choice) {
    if (busy || state.error) return
    busy = true
    var editGeneration = generation
    var expected = externalRevision
    var completed = false
    dispatch({
      type: "read",
      complete: function(result) {
        if (completed || disposed) return
        completed = true
        busy = false
        if (!result || result.status !== "ok") {
          state.error = true
          state.errorReason = result && result.reason || ""
          return
        }
        if (choice) {
          if (expected === null || expected !== result.revision ||
              (choice === "external" && generation !== editGeneration)) {
            externalRevision = result.revision
            state.conflict = true
            return
          }
          state.revision = result.revision
          state.conflict = false
          if (choice === "external") {
            state.text = result.text
            state.dirty = false
            flushRequested = false
          } else {
            state.dirty = true
            state.flush()
          }
          return
        }
        if (result.revision !== state.revision) {
          if (state.dirty || state.conflict || generation !== editGeneration) {
            externalRevision = result.revision
            state.conflict = true
          } else {
            state.text = result.text
            state.revision = result.revision
          }
        }
        if (flushRequested && !state.conflict) state.flush()
      }
    })
  }

  state.refresh = function() {
    if (state.loaded) read(null)
  }
  state.resolve = function(choice) {
    if (state.conflict && (choice === "local" || choice === "external")) read(choice)
  }

  state.load = function() {
    if (busy || state.loaded || state.conflict) return
    busy = true
    var editGeneration = generation
    var completed = false
    dispatch({
      type: "read",
      complete: function(result) {
        if (completed || disposed) return
        completed = true
        busy = false
        if (!result || result.status !== "ok") {
          state.error = true
          state.errorReason = result && result.reason || ""
          return
        }
        state.loaded = true
        state.revision = result.revision
        state.error = false
        state.errorReason = ""
        if (generation !== editGeneration || state.dirty) {
          externalRevision = result.revision
          state.conflict = true
          return
        }
        state.text = result.text
      }
    })
  }

  state.edit = function(text) {
    if (text === state.text) return
    state.text = text
    state.dirty = true
    generation++
  }

  state.flush = function() {
    if (!state.dirty || state.error || state.conflict || !state.loaded) return
    if (busy) {
      flushRequested = true
      return
    }
    busy = true
    flushRequested = false
    var snapshot = state.text
    var editGeneration = generation
    var completed = false
    dispatch({
      type: "write",
      text: snapshot,
      revision: state.revision,
      complete: function(result) {
        if (completed || disposed) return
        completed = true
        busy = false
        if (!result || result.status === "error") {
          state.error = true
          state.errorReason = result && result.reason || ""
          return
        }
        if (result.status !== "ok") {
          state.conflict = true
          externalRevision = null
          return
        }
        state.revision = result.revision
        state.dirty = generation !== editGeneration
        if (state.dirty && flushRequested) state.flush()
      }
    })
  }

  state.close = function() { state.flush() }
  state.retry = function() {
    if (!state.error && state.conflict) return
    state.error = false
    state.errorReason = ""
    if (!state.loaded) state.load()
    else if (state.conflict) state.refresh()
    else state.flush()
  }
  return state
}

if (typeof module !== "undefined") module.exports = { createNoteState: createNoteState }
