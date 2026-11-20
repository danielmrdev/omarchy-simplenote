import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import "NoteState.js" as NoteState
import "Shortcut.js" as Shortcut
import "i18n.js" as T

Item {
  id: root
  property var shell: null
  readonly property string uiLanguage: T.languageFromBar(shell ? shell.barConfig : null)
  property var machine: null
  property var request: null
  property var shortcutRouter: Shortcut.createRouter(
    function() { return editor.opened },
    function() { editor.openEditor() },
    function() { editor.closeEditor() })
  property string text: ""
  property bool dirty: false
  property bool error: false
  property string errorReason: ""
  property bool conflict: false
  property string externalText: ""
  property bool loaded: false
  property bool timedOut: false
  // Two 1 MiB UTF-8 notes can each expand to six ASCII JSON characters per
  // byte, plus protocol metadata. Never retain stderr, which may contain data.
  readonly property int outputLimit: 13 * 1024 * 1024
  property string processOutput: ""
  property bool processFailed: false
  property string editShortcut: ""
  property string shortcutOutput: ""
  property string lastCopiedSelection: ""

  function sync() {
    text = machine.text
    dirty = machine.dirty
    error = machine.error
    errorReason = machine.errorReason
    conflict = machine.conflict
    externalText = machine.externalText
    loaded = machine.loaded
  }
  function dispatch(operation) {
    request = operation
    timedOut = false
    processOutput = ""
    processFailed = false
    if (operation.type === "write" && NoteState.exceedsNoteLimit(operation.text)) {
      Qt.callLater(function() {
        if (root.request === operation)
          root.finish({ status: "error", reason: "note_too_large" })
      })
      return
    }
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
  function openEditor() { shortcutRouter.open() }
  function closeEditor() { editor.closeEditor() }
  // Copy-on-select writes the regular clipboard; repeating the same selection
  // must not churn clipboard history when the views re-render.
  function copySelection(value) {
    var text = String(value || "")
    if (text === "") {
      lastCopiedSelection = ""
      return
    }
    if (text === lastCopiedSelection) return
    lastCopiedSelection = text
    Quickshell.clipboardText = text
  }
  function refreshShortcut() {
    if (shortcutProcess.running) return
    shortcutOutput = ""
    shortcutProcess.running = true
    shortcutWatchdog.restart()
  }

  Timer {
    id: shortcutWatchdog
    interval: 3000
    onTriggered: if (shortcutProcess.running) shortcutProcess.running = false
  }
  Process {
    id: shortcutProcess
    command: ["hyprctl", "binds", "-j"]
    stdout: SplitParser {
      splitMarker: ""
      onRead: function(chunk) {
        if (root.shortcutOutput.length + chunk.length > 1048576) {
          root.shortcutOutput = ""
          shortcutProcess.running = false
        } else root.shortcutOutput += chunk
      }
    }
    stderr: SplitParser { splitMarker: ""; onRead: function(chunk) {} }
    onExited: function(code, status) {
      shortcutWatchdog.stop()
      var found = ""
      if (code === 0) {
        try { found = Shortcut.noteShortcut(JSON.parse(root.shortcutOutput)) } catch (e) {}
      }
      root.editShortcut = found
      root.shortcutOutput = ""
    }
  }

  Editor {
    id: editor
    service: root
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
                             revision: root.request.revision, recovery: root.request.recovery,
                             recoveryRevision: root.request.recoveryRevision }) + "\n")
    }
    stdout: SplitParser {
      splitMarker: ""
      onRead: function(chunk) {
        if (root.processFailed) return
        if (root.processOutput.length + chunk.length > root.outputLimit) {
          root.processFailed = true
          process.running = false
        } else {
          root.processOutput += chunk
        }
      }
    }
    stderr: SplitParser {
      splitMarker: ""
      onRead: function(chunk) {
        if (chunk.length) {
          root.processFailed = true
          process.running = false
        }
      }
    }
    onExited: function(code, status) {
      var result = { status: "error" }
      try {
        if (code === 0 && !root.timedOut && !root.processFailed)
          result = JSON.parse(root.processOutput)
      } catch (e) {}
      root.processOutput = ""
      root.finish(result)
    }
  }
}
