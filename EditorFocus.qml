import QtQuick

FocusScope {
  signal escapeRequested()
  focus: true
  Keys.onEscapePressed: function(event) {
    escapeRequested()
    event.accepted = true
  }
}
