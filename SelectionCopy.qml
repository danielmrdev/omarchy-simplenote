import QtQuick

// Copy-on-select for a TextEdit. A short settle delay keeps a mouse drag from
// writing the clipboard on every intermediate character range.
Item {
  id: root

  property var target: null
  property int delay: 200

  signal copyRequested(string text)
  signal selectionCleared()

  function copyNow() {
    if (!target) return
    var value = String(target.selectedText || "")
    if (value !== "") root.copyRequested(value)
  }

  Timer {
    id: settle
    interval: Math.max(0, root.delay)
    onTriggered: root.copyNow()
  }

  Connections {
    target: root.target

    function onSelectedTextChanged() {
      if (root.target && String(root.target.selectedText || "") !== "") settle.restart()
      else {
        settle.stop()
        if (root.target) root.selectionCleared()
      }
    }
  }
}
