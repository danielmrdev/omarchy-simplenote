import QtQuick
import QtQuick.Controls
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import "i18n.js" as T

Panel {
  id: root
  moduleName: "danielmrdev.simplenote"
  manageIpc: false
  property var anchorItem: null
  property var hostWidget: null
  property var service: null
  property string localeName: "en"
  property bool editorOpened: false
  property bool showingAbout: false
  readonly property string pluginVersion: "0.1.0"
  function tr(key) { return T.t(key, localeName) }
  function toggleAbout() {
    showingAbout = !showingAbout
    aboutFlick.contentY = 0
    aboutToggle.forceActiveFocus()
  }
  function statusText() {
    if (service && service.errorReason === "recovery_limit") return tr("recoveryLimit")
    if (service && service.errorReason === "displaced_conflict") return tr("displacedConflict")
    if (service && service.error) return tr("error")
    if (service && service.conflict) return tr("conflict")
    return tr("error")
  }
  function openEditor() {
    if (!service) return
    root.close()
    service.openEditor(root)
    editorOpened = true
    Qt.callLater(function() {
      editor.cursorPosition = editor.length
      editor.forceActiveFocus()
    })
  }
  function closeEditor() {
    if (!editorOpened) return
    editorOpened = false
    if (service) service.closeEditor(root)
  }

  KeyboardPanel {
    id: reader
    bar: root.bar
    anchorItem: root.anchorItem
    owner: root.hostWidget
    open: root.opened
    focusTarget: readerContent
    contentWidth: fittedContentWidth(Style.space(400))
    contentHeight: fittedContentHeight(Style.space(350))
    Column {
      id: readerContent
      anchors.fill: parent
      spacing: Style.space(8)
      Keys.onEscapePressed: root.close()
      Item {
        width: parent.width
        height: Style.space(36)
        Text {
          anchors.verticalCenter: parent.verticalCenter
          text: root.tr("note")
          textFormat: Text.PlainText
          color: Commons.Color.foreground
          font.family: Style.font.family
          font.pixelSize: Style.font.body
          font.bold: true
        }
        PanelActionButton {
          id: editButton
          anchors.right: parent.right
          anchors.verticalCenter: parent.verticalCenter
          iconText: "󰏫"
          tooltipText: root.tr("edit")
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
        visible: !root.showingAbout
        width: parent.width
        height: Math.max(0, parent.height - y)
        clip: true
        TextArea {
          readOnly: true
          selectByMouse: true
          textFormat: TextEdit.PlainText
          wrapMode: TextEdit.Wrap
          text: !root.service || !root.service.loaded ? root.tr("loading")
            : root.service.text === "" ? root.tr("empty") : root.service.text
          color: Commons.Color.foreground
          font.family: Style.font.family
          background: Item {}
        }
      }
      ScrollView {
        visible: root.showingAbout
        width: parent.width
        height: Math.max(0, parent.height - y)
        clip: true
        Flickable {
          id: aboutFlick
          contentWidth: width
          contentHeight: aboutContent.height
          boundsBehavior: Flickable.StopAtBounds
          Column {
            id: aboutContent
            width: aboutFlick.width
            spacing: Style.space(12)
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
            Text {
              width: parent.width
              text: root.tr("aboutDescription")
              textFormat: Text.PlainText
              wrapMode: Text.Wrap
              color: Commons.Color.foreground
              font.family: Style.font.family
              font.pixelSize: Style.font.body
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
    }
  }

  KeyboardPanel {
    id: editorPanel
    bar: root.bar
    anchorItem: root.anchorItem
    owner: root.hostWidget
    open: root.editorOpened
    centerOnBar: true
    focusTarget: editor
    contentWidth: fittedContentWidth(Style.space(560))
    contentHeight: fittedContentHeight(Style.space(430))
    Column {
      anchors.fill: parent
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
