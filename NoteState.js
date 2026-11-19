// Pure state machine. The host owns scheduling and the storage adapter.
// A successful write must mean that the adapter has durably acknowledged
// the exact snapshot and checked the supplied revision for conflicts.
function createNoteState(dispatch) {
  var state = {
    text: "",
    dirty: false,
    error: false,
    conflict: false,
    loaded: false,
    revision: null
  }
  var busy = false
  var flushRequested = false
  var generation = 0

  state.load = function() {
    if (busy || state.loaded || state.conflict) return
    busy = true
    var editGeneration = generation
    var completed = false
    dispatch({
      type: "read",
      complete: function(result) {
        if (completed) return
        completed = true
        busy = false
        if (!result || result.status !== "ok") {
          state.error = true
          return
        }
        state.loaded = true
        state.revision = result.revision
        state.error = false
        if (generation !== editGeneration || state.dirty) {
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
        if (completed) return
        completed = true
        busy = false
        if (!result || result.status === "error") {
          state.error = true
          return
        }
        if (result.status !== "ok") {
          state.conflict = true
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
    if (state.conflict) return
    state.error = false
    if (!state.loaded) state.load()
    else state.flush()
  }
  return state
}

if (typeof module !== "undefined") module.exports = { createNoteState: createNoteState }
