import QtQuick
import qs.Commons
import qs.Ui
import "i18n.js" as T

BarWidget {
  id: root
  moduleName: "danielmrdev.simplenote"
  readonly property var noteService: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
  readonly property string localeName: Qt.locale().uiLanguages.length
    ? Qt.locale().uiLanguages[0] : Qt.locale().name
  readonly property bool opened: popup.opened || popup.editorOpened
  readonly property bool popoutSwitchClosing: popup.popoutSwitchClosing
  function open() { popup.open() }
  function close() { popup.close(); popup.closeEditor() }
  function closeForPopoutSwitch() { close() }
  function togglePanel() { opened ? close() : open() }
  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "󰎞"
    tooltipText: T.t("note", root.localeName)
    onPressed: root.togglePanel()
  }
  NotePanel {
    id: popup
    bar: root.bar
    anchorItem: button
    hostWidget: root
    service: root.noteService
    localeName: root.localeName
  }
}
