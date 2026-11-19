import QtQuick
import Quickshell.Io
import qs.Commons
import "NoteState.js" as NoteState
import "Shortcut.js" as Shortcut

Item {
  id: root
  property var shell: null
  property var machine: null
  property var request: null
  property var editorOwner: null
  property var shortcutRouter: Shortcut.createRouter(
    function() { return root.editorOwner },
    function() { return root.shell ? root.shell.summon("danielmrdev.simplenote", "{}") : false })
  property string text: ""
  property bool dirty: false
  property bool error: false
  property string errorReason: ""
  property bool conflict: false
  property bool loaded: false
  property bool timedOut: false

  function sync() {
    text = machine.text
    dirty = machine.dirty
    error = machine.error
    errorReason = machine.errorReason
    conflict = machine.conflict
    loaded = machine.loaded
  }
  function dispatch(operation) {
    request = operation
    timedOut = false
    watchdog.restart()
    Qt.callLater(function() {
      if (root.request === operation) process.running = true
    })
  }
  function finish(result) {
    if (!request) return
    watchdog.stop()
    var operation = request
    request = null
    operation.complete(result)
    sync()
  }
  function edit(value) {
    machine.edit(value)
    sync()
    debounce.restart()
  }
  function flush() {
    debounce.stop()
    machine.flush()
    sync()
  }
  function retry() {
    if (request) return
    machine.retry()
    sync()
  }
  function resolve(choice) {
    machine.resolve(choice)
    sync()
  }
  function openEditor(owner) {
    if (editorOwner && editorOwner !== owner) editorOwner.closeEditor()
    editorOwner = owner
  }
  function closeEditor(owner) {
    flush()
    if (editorOwner === owner) editorOwner = null
  }

  ShellIpc {
    target: "danielmrdev.simplenote.editor"
    function open(): string { return root.shortcutRouter.open() }
    function toggle(): string { return root.shortcutRouter.toggle() }
  }

  Component.onCompleted: {
    machine = NoteState.createNoteState(root.dispatch)
    machine.load()
    sync()
  }
  Component.onDestruction: if (machine) machine.dispose()

  Timer {
    id: debounce
    interval: 500
    onTriggered: root.flush()
  }
  Timer {
    interval: 2000
    running: true
    repeat: true
    onTriggered: {
      root.machine.refresh()
      root.sync()
    }
  }
  Timer {
    id: watchdog
    interval: 10000
    onTriggered: {
      root.timedOut = true
      root.error = true
      if (process.running) process.running = false
      else root.finish({ status: "error" })
    }
  }
  Process {
    id: process
    command: ["python3", decodeURIComponent(String(Qt.resolvedUrl("storage.py")).replace(/^file:\/\//, ""))]
    stdinEnabled: true
    onStarted: {
      write(JSON.stringify({ type: root.request.type, text: root.request.text,
                             revision: root.request.revision }) + "\n")
    }
    stdout: StdioCollector { id: output }
    onExited: function(code, status) {
      var result = { status: "error" }
      try {
        if (code === 0 && !root.timedOut) result = JSON.parse(output.text)
      } catch (e) {}
      root.finish(result)
    }
  }
}
