// Pure state machine. The host owns scheduling and the storage adapter.
// A successful write must mean that the adapter has durably acknowledged
// the exact snapshot and checked the supplied revision for conflicts.
// Count UTF-8 bytes without allocating an encoded copy of potentially large
// pasted text. Stop once the storage limit is known to be exceeded.
function exceedsNoteLimit(text) {
  var bytes = 0
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i)
    if (c < 0x80) bytes++
    else if (c < 0x800) bytes += 2
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length &&
             text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) {
      bytes += 4
      i++
    } else bytes += 3
    if (bytes > 1024 * 1024) return true
  }
  return false
}

function createNoteState(dispatch) {
  var state = {
    text: "",
    dirty: false,
    error: false,
    errorReason: "",
    conflict: false,
    externalText: "",
    loaded: false,
    revision: null
  }
  var busy = false
  var flushRequested = false
  var generation = 0
  var externalRevision = null
  var recovery = null
  var observedDiskRevision = null
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
      recovery: recovery,
      complete: function(result) {
        if (completed || disposed) return
        completed = true
        busy = false
        if (!result || result.status !== "ok") {
          state.error = true
          state.errorReason = result && result.reason || ""
          return
        }
        if (recovery && observedDiskRevision !== null && observedDiskRevision !== result.revision) {
          // A new path version takes priority; the previous displaced copy
          // remains protected on disk for manual inspection.
          recovery = null
          externalRevision = result.revision
          state.externalText = result.text
          state.conflict = true
          return
        }
        var actualExternalRevision = recovery ? result.recoveryRevision : result.revision
        var actualExternalText = recovery ? result.recoveryText : result.text
        if (choice) {
          if (expected === null || expected !== actualExternalRevision ||
              (choice === "external" && generation !== editGeneration)) {
            externalRevision = actualExternalRevision
            observedDiskRevision = result.revision
            state.externalText = actualExternalText
            state.conflict = true
            return
          }
          if (recovery) {
            writeResolution(choice, result)
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
        if (recovery) {
          observedDiskRevision = result.revision
          externalRevision = actualExternalRevision
          state.externalText = actualExternalText
          state.conflict = true
          return
        }
        if (result.revision !== state.revision || (state.conflict && externalRevision === null)) {
          if (state.dirty || state.conflict || generation !== editGeneration) {
            externalRevision = result.revision
            state.externalText = result.text
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

  function writeResolution(choice, result) {
    busy = true
    var selected = choice === "external" ? result.recoveryText : state.text
    var editGeneration = generation
    var completed = false
    dispatch({
      type: "write", text: selected, revision: result.revision,
      recovery: recovery, recoveryRevision: result.recoveryRevision,
      complete: function(outcome) {
        if (completed || disposed) return
        completed = true
        busy = false
        if (!outcome || outcome.status === "error") {
          state.error = true
          state.errorReason = outcome && outcome.reason || ""
          return
        }
        if (outcome.status !== "ok") {
          if (outcome.recovery) {
            recovery = outcome.recovery
            observedDiskRevision = outcome.writtenRevision || null
          }
          externalRevision = null
          return
        }
        state.revision = outcome.revision
        recovery = null
        observedDiskRevision = null
        if (choice === "external" && generation !== editGeneration) {
          state.externalText = selected
          externalRevision = outcome.revision
          state.conflict = true
          return
        }
        if (choice === "external") state.text = selected
        state.dirty = generation !== editGeneration
        state.conflict = false
        if (state.dirty && flushRequested) state.flush()
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
          state.externalText = result.text
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
          recovery = result.recovery || null
          observedDiskRevision = result.writtenRevision || null
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

if (typeof module !== "undefined") module.exports = {
  createNoteState: createNoteState, exceedsNoteLimit: exceedsNoteLimit
}
