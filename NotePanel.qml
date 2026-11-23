import QtQuick
import QtQuick.Controls
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import qs.Ui as Ui
import "i18n.js" as T

Panel {
  id: root
  moduleName: "danielmrdev.simplenote"
  manageIpc: false
  property var anchorItem: null
  property var hostWidget: null
  property var service: null
  property string localeName: "en"
  property string uiLanguage: "system"
  readonly property color heroForeground: bar ? bar.foreground : Commons.Color.foreground
  readonly property string heroFontFamily: bar ? bar.fontFamily : Style.font.family
  property bool showingAbout: false
  readonly property string pluginVersion: "0.1.1"
  function tr(key) { return T.t(key, localeName, uiLanguage) }
  function toggleAbout() {
    showingAbout = !showingAbout
    bodyViewport.contentY = 0
    aboutToggle.forceActiveFocus()
  }
  function statusText() {
    if (service && service.errorReason === "recovery_limit") return tr("recoveryLimit")
    if (service && service.errorReason === "note_too_large") return tr("noteTooLarge")
    if (service && service.error) return tr("error")
    if (service && service.conflict) return tr("conflict")
    return tr("error")
  }
  function openEditor() {
    if (!service) return
    root.close()
    service.openEditor()
  }

  KeyboardPanel {
    id: reader
    bar: root.bar
    anchorItem: root.anchorItem
    owner: root.hostWidget
    open: root.opened
    focusTarget: readerContent
    contentWidth: fittedContentWidth(Style.space(400))
    contentHeight: fittedContentHeight(root.showingAbout
      ? header.implicitHeight + separator.implicitHeight + bodyContent.implicitHeight + readerContent.spacing * 2
      : Style.space(350))
    Column {
      id: readerContent
      anchors.fill: parent
      spacing: Style.space(8)
      Keys.onEscapePressed: root.close()
      Item {
        id: header
        width: parent.width
        implicitHeight: Math.max(heroIcon.implicitHeight + Style.space(6), heroLabels.implicitHeight, editButton.implicitHeight, aboutToggle.implicitHeight)
        height: implicitHeight
        Text {
          id: heroIcon
          anchors.left: parent.left
          anchors.verticalCenter: parent.verticalCenter
          text: "󰎞"
          textFormat: Text.PlainText
          color: root.heroForeground
          font.family: root.heroFontFamily
          font.pixelSize: Style.font.displayLarge + Style.space(4)
        }
        Column {
          id: heroLabels
          anchors.left: heroIcon.right
          anchors.leftMargin: Style.space(14)
          anchors.right: aboutToggle.left
          anchors.rightMargin: Style.space(8)
          anchors.verticalCenter: parent.verticalCenter
          spacing: Style.space(2)
          Text {
            width: parent.width
            text: "Simple Note"
            textFormat: Text.PlainText
            color: root.heroForeground
            font.family: root.heroFontFamily
            font.pixelSize: Style.font.title
            font.bold: true
            elide: Text.ElideRight
          }
          Text {
            width: parent.width
            text: root.tr("subtitle")
            textFormat: Text.PlainText
            color: root.heroForeground
            opacity: 0.6
            font.family: root.heroFontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1
            elide: Text.ElideRight
          }
        }
        PanelActionButton {
          id: editButton
          anchors.right: parent.right
          anchors.verticalCenter: parent.verticalCenter
          iconText: "󰏫"
          tooltipText: root.tr("edit") + (root.service && root.service.editShortcut ? " (" + root.service.editShortcut + ")" : "")
          focusable: true
          foreground: Commons.Color.foreground
          fontFamily: Style.font.family
          onClicked: root.openEditor()
        }
        Button {
          id: aboutToggle
          anchors.right: editButton.left
          anchors.rightMargin: Style.space(8)
          anchors.verticalCenter: parent.verticalCenter
          text: root.showingAbout ? root.tr("note") : "v" + root.pluginVersion
          Accessible.name: root.showingAbout ? root.tr("note") : root.tr("about")
          onClicked: root.toggleAbout()
        }
      }
      PanelSeparator {
        id: separator
        foreground: Commons.Color.foreground
      }
      Flickable {
        id: bodyViewport
        width: parent.width
        height: Math.max(0, parent.height - y)
        contentWidth: width
        contentHeight: bodyContent.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height
          Column {
            id: bodyContent
            width: bodyViewport.width
            spacing: Style.space(8)
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
            Column {
              visible: root.service && root.service.conflict && !root.service.error
              spacing: Style.space(8)
              Button { text: root.tr("keepLocal"); onClicked: root.service.resolve("local") }
              Button { text: root.tr("loadExternal"); onClicked: root.service.resolve("external") }
            }
            Text {
              visible: root.service && root.service.conflict
              text: root.tr("externalVersion")
              color: Commons.Color.foreground
              font.family: Style.font.family
            }
            ScrollView {
              visible: root.service && root.service.conflict
              width: parent.width
              height: visible ? Style.space(80) : 0
              clip: true
              TextArea {
                readOnly: true
                selectByMouse: true
                textFormat: TextEdit.PlainText
                wrapMode: TextEdit.Wrap
                text: root.service ? root.service.externalText : ""
                color: Commons.Color.foreground
                font.family: Style.font.family
                background: Item {}
              }
            }
            ScrollView {
              visible: !root.showingAbout
              width: parent.width
              height: visible ? Math.max(Style.space(120), bodyViewport.height - y) : 0
              clip: true
              TextArea {
                id: noteReader
                readOnly: true
                selectByMouse: true
                textFormat: TextEdit.PlainText
                wrapMode: TextEdit.Wrap
                text: !root.service || !root.service.loaded ? root.tr("loading")
                  : root.service.text === "" ? root.tr("empty") : root.service.text
                color: Commons.Color.foreground
                opacity: !root.service || !root.service.loaded || root.service.text === "" ? 0.6 : 1
                font.family: Style.font.family
                background: Item {}
              }
            }
            Column {
              visible: root.showingAbout
              width: parent.width
              spacing: Style.space(12)
                  Text {
                    width: parent.width
                    text: root.tr("aboutDescription")
                    textFormat: Text.PlainText
                    wrapMode: Text.Wrap
                    color: Commons.Color.foreground
                    font.family: Style.font.family
                    font.pixelSize: Style.font.body
                  }
                  Row {
                    width: parent.width
                    spacing: Style.space(8)
                    PanelSectionHeader {
                      id: aboutHeader
                      text: root.tr("aboutInfo").toUpperCase()
                    }
                    PanelSectionHeader {
                      width: Math.max(0, parent.width - aboutHeader.width - parent.spacing)
                      text: "v" + root.pluginVersion
                      horizontalAlignment: Text.AlignRight
                    }
                  }
                  Ui.Button {
                    width: parent.width
                    text: root.tr("changelog")
                    iconText: "\uf15c"
                    bordered: true
                    leftAlign: true
                    focusable: true
                    onClicked: Qt.openUrlExternally("https://github.com/danielmrdev/omarchy-simplenote/blob/main/CHANGELOG.md")
                  }
                  Ui.Button {
                    width: parent.width
                    text: root.tr("marketplace")
                    iconText: "\uf07a"
                    bordered: true
                    leftAlign: true
                    focusable: true
                    onClicked: Qt.openUrlExternally("https://omarchyplugins.com/plugin.html?id=danielmrdev.simplenote")
                  }
                  Ui.Button {
                    width: parent.width
                    text: root.tr("reportIssue")
                    iconText: "\uf071"
                    bordered: true
                    leftAlign: true
                    focusable: true
                    onClicked: Qt.openUrlExternally("https://github.com/danielmrdev/omarchy-simplenote/issues")
                  }
                  Ui.Button {
                    width: parent.width
                    text: root.tr("github")
                    iconText: "\uf09b"
                    bordered: true
                    leftAlign: true
                    focusable: true
                    onClicked: Qt.openUrlExternally("https://github.com/danielmrdev/omarchy-simplenote")
                  }
                  PanelSeparator { foreground: Commons.Color.foreground }
                  PanelSectionHeader { text: root.tr("settings").toUpperCase() }
                  PanelSectionHeader { text: root.tr("language").toUpperCase() }
                  Row {
                    width: parent.width
                    spacing: Style.space(4)
                    Ui.Button {
                      text: root.tr("languageSystem")
                      selected: root.uiLanguage === "system"
                      focusable: true
                      onClicked: if (root.hostWidget) root.hostWidget.setUiLanguage("system")
                    }
                    Ui.Button {
                      text: root.tr("languageEnglish")
                      selected: root.uiLanguage === "en"
                      focusable: true
                      onClicked: if (root.hostWidget) root.hostWidget.setUiLanguage("en")
                    }
                    Ui.Button {
                      text: root.tr("languageSpanish")
                      selected: root.uiLanguage === "es"
                      focusable: true
                      onClicked: if (root.hostWidget) root.hostWidget.setUiLanguage("es")
                    }
                  }
                  Text {
                    width: parent.width
                    text: root.tr("aboutPrivacy")
                    textFormat: Text.PlainText
                    wrapMode: Text.Wrap
                    color: Commons.Color.foreground
                    opacity: 0.6
                    font.family: Style.font.family
                    font.pixelSize: Style.font.body
                  }
            }
          }
      }
      SelectionCopy {
        target: noteReader
        onCopyRequested: function(text) { if (root.service) root.service.copySelection(text) }
        onSelectionCleared: if (root.service) root.service.copySelection("")
      }
    }
  }

}
