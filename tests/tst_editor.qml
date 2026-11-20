import QtQuick
import QtQuick.Controls
import QtTest
import ".." as Plugin

TestCase {
  id: testCase
  name: "EditorEscape"
  when: windowShown
  width: 320
  height: 240

  property bool opened: false
  property bool loaded: false
  property int edits: 0
  property int retries: 0
  Plugin.EditorFocus {
    id: scope
    anchors.fill: parent
    onEscapeRequested: testCase.opened = false
    TextArea {
      id: editor
      enabled: testCase.loaded
      onTextEdited: testCase.edits++
    }
    Button {
      id: other
      y: 100
      text: "Retry"
      onClicked: testCase.retries++
    }
  }

  function test_escape_before_load() {
    loaded = false
    opened = true
    scope.forceActiveFocus()
    keyClick(Qt.Key_Escape)
    compare(opened, false)
  }
  function test_escape_after_load_and_focus() {
    loaded = true
    opened = true
    editor.forceActiveFocus()
    keyClick(Qt.Key_Escape)
    compare(opened, false)
  }
  function test_escape_with_another_focused_control() {
    loaded = true
    opened = true
    other.forceActiveFocus()
    keyClick(Qt.Key_Escape)
    compare(opened, false)
  }
  function test_typing_and_retry_keyboard_activation() {
    loaded = true
    editor.text = ""
    edits = 0
    retries = 0
    editor.forceActiveFocus()
    keyClick(Qt.Key_N)
    compare(editor.text, "n")
    verify(edits > 0)
    other.forceActiveFocus()
    keyClick(Qt.Key_Space)
    compare(retries, 1)
  }
}
