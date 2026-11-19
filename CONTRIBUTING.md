# Contributing

The project is in its initial setup stage. Its scope and implementation have
not yet been defined.

## Getting started

1. Discuss substantial changes before implementing them.
2. Keep changes focused and document relevant behavior and dependencies.
3. Run the checks applicable to your changes and describe their results.
4. Open a pull request describing the change and any remaining limitations.

Once the plugin exists, validate its manifest and QML against the target
Omarchy shell. See the [development guide](https://plugins.omarchy.org/develop.html)
for the current commands.

Run the editor focus regression with Qt 6 Quick Test (offscreen, without the
running shell):

```sh
QT_QPA_PLATFORM=offscreen /usr/lib/qt6/bin/qmltestrunner -input tests/tst_editor.qml
```

## Release preparation

Before publishing, ensure the README describes the actual functionality,
requirements, permissions, installation, and removal. Update the changelog,
validate the plugin, and follow the current
[publishing guide](https://plugins.omarchy.org/publish.html). The manifest
version, changelog, and release tag should agree.

Never include credentials, personal notes, or other private data in commits,
logs, screenshots, or issue reports.
