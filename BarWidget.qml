import QtQuick
import qs.Commons
import qs.Ui
import "i18n.js" as T

BarWidget {
  id: root
  moduleName: "danielmrdev.simplenote"
  readonly property var noteService: bar && bar.shell ? bar.shell.serviceFor(moduleName) : null
  readonly property string localeName: I18n.language
  readonly property string uiLanguage: T.normalizeOverride(setting("uiLanguage", "system"))
  function setUiLanguage(value) {
    var entry = { id: root.moduleName }
    var current = root.settings || {}
    for (var key in current) if (key !== "id") entry[key] = current[key]
    entry.uiLanguage = T.normalizeOverride(value)
    root.settings = entry
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entry)
  }
  readonly property bool opened: popup.opened
  readonly property bool popoutSwitchClosing: popup.popoutSwitchClosing
  function open() { if (noteService) noteService.refreshShortcut(); popup.open() }
  function close() { popup.close() }
  function closeForPopoutSwitch() { close() }
  function togglePanel() { opened ? close() : open() }
  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "󰎞"
    tooltipText: T.t("note", root.localeName, root.uiLanguage)
    onPressed: root.togglePanel()
  }
  NotePanel {
    id: popup
    bar: root.bar
    anchorItem: button
    hostWidget: root
    service: root.noteService
    localeName: root.localeName
    uiLanguage: root.uiLanguage
  }
}
