import QtQuick
import QtQuick.Controls
import Quickshell
import Quickshell.Hyprland
import Quickshell.Wayland
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import "i18n.js" as T
import "Shortcut.js" as Shortcut

PanelWindow {
  id: root
  property var service: null
  property bool opened: false
  property bool focusPrimed: false
  property var targetScreen: null
  readonly property string localeName: I18n.language

  function tr(key) { return T.t(key, localeName) }
  function focusEditor() {
    Qt.callLater(function() {
      if (!root.opened || !root.service || !root.service.loaded) return
      editor.cursorPosition = editor.length
      editor.forceActiveFocus()
    })
  }
  function openEditor() {
    var monitor = Hyprland.focusedMonitor
    targetScreen = Shortcut.selectScreen(Quickshell.screens, monitor ? monitor.name : "")
    focusPrimed = false
    opened = true
    focusTimer.restart()
    focusEditor()
  }
  function closeEditor() {
    if (!opened) return
    opened = false
    focusTimer.stop()
    if (service) service.flush()
  }
  function statusText() {
    if (service && service.errorReason === "recovery_limit") return tr("recoveryLimit")
    if (service && service.errorReason === "displaced_conflict") return tr("displacedConflict")
    if (service && service.error) return tr("error")
    if (service && service.conflict) return tr("conflict")
    return tr("error")
  }

  screen: targetScreen
  visible: opened
  color: "transparent"
  exclusionMode: ExclusionMode.Ignore
  anchors { top: true; bottom: true; left: true; right: true }
  WlrLayershell.namespace: "simplenote-editor"
  WlrLayershell.layer: WlrLayer.Overlay
  WlrLayershell.keyboardFocus: !opened ? WlrKeyboardFocus.None
    : focusPrimed ? WlrKeyboardFocus.OnDemand : WlrKeyboardFocus.Exclusive
  onBackingWindowVisibleChanged: {
    if (opened && backingWindowVisible) {
      focusTimer.restart()
      focusEditor()
    }
  }
  Connections {
    target: root.service
    function onLoadedChanged() { if (root.service.loaded && root.opened) root.focusEditor() }
  }
  Timer {
    id: focusTimer
    interval: 75
    onTriggered: if (root.opened) root.focusPrimed = true
  }

  MouseArea {
    anchors.fill: parent
    onClicked: root.closeEditor()
  }
  Rectangle {
    id: card
    anchors.centerIn: parent
    width: Math.max(1, Math.min(Style.space(560), parent.width - Style.gapsOut * 2))
    height: Math.max(1, Math.min(Style.space(430), parent.height - Style.gapsOut * 2))
    radius: Style.cornerRadius
    color: Commons.Color.popups.background
    border.color: Commons.Color.popups.border
    border.width: Math.max(1, Style.space(2))
    MouseArea { anchors.fill: parent }
    Column {
      anchors.fill: parent
      anchors.margins: Style.spacing.popupPadding
      spacing: Style.space(8)
      Item {
        width: parent.width
        height: Style.space(32)
        PanelActionButton {
          anchors.right: parent.right
          iconText: "󰅖"
          tooltipText: root.tr("close")
          foreground: Commons.Color.foreground
          fontFamily: Style.font.family
          onClicked: root.closeEditor()
        }
      }
      Text {
        width: parent.width
        visible: root.service && (root.service.error || root.service.conflict)
        text: root.statusText()
        textFormat: Text.PlainText
        wrapMode: Text.Wrap
        color: Commons.Color.foreground
      }
      Button {
        visible: root.service && root.service.error
        text: root.tr("retry")
        onClicked: root.service.retry()
      }
      Row {
        visible: root.service && root.service.conflict && !root.service.error
        spacing: Style.space(8)
        Button { text: root.tr("keepLocal"); onClicked: root.service.resolve("local") }
        Button { text: root.tr("loadExternal"); onClicked: root.service.resolve("external") }
      }
      ScrollView {
        width: parent.width
        height: Math.max(0, parent.height - y)
        clip: true
        TextArea {
          id: editor
          text: root.service ? root.service.text : ""
          enabled: !!root.service && root.service.loaded
          textFormat: TextEdit.PlainText
          wrapMode: TextEdit.Wrap
          selectByMouse: true
          color: Commons.Color.foreground
          font.family: Style.font.family
          background: Item {}
          onTextEdited: if (root.service) root.service.edit(text)
          Keys.onEscapePressed: function(event) { root.closeEditor(); event.accepted = true }
        }
      }
    }
  }
}
