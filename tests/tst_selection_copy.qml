import QtQuick
import QtQuick.Controls
import QtTest
import ".." as Plugin

TestCase {
  id: testCase
  name: "SelectionCopy"
  when: windowShown
  width: 320
  height: 240

  property string copied: ""
  property int cleared: 0

  TextArea {
    id: reader
    anchors.fill: parent
    readOnly: true
    text: "alpha beta gamma"
    selectByMouse: true
  }

  Plugin.SelectionCopy {
    target: reader
    delay: 20
    onCopyRequested: function(text) { testCase.copied = text }
    onSelectionCleared: testCase.cleared++
  }

  function init() {
    copied = ""
    cleared = 0
    reader.deselect()
    wait(30)
  }

  function test_selection_is_copied_after_settling() {
    reader.select(0, 5)
    tryCompare(testCase, "copied", "alpha", 1000)
  }

  function test_clearing_the_selection_does_not_copy() {
    reader.select(6, 10)
    tryCompare(testCase, "copied", "beta", 1000)
    const before = cleared
    reader.deselect()
    wait(60)
    compare(copied, "beta")
    verify(cleared > before)
  }

  function test_dragging_through_ranges_copies_only_the_settled_selection() {
    reader.select(0, 1)
    wait(5)
    reader.select(0, 10)
    tryCompare(testCase, "copied", "alpha beta", 1000)
  }
}
