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
  Plugin.EditorFocus {
    id: scope
    anchors.fill: parent
    onEscapeRequested: testCase.opened = false
    TextArea {
      id: editor
      enabled: testCase.loaded
    }
    Button { id: other }
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
}
