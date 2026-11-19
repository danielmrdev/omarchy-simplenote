# Contributing

The plugin targets Omarchy 4.5 and later. Static checks do not establish runtime
compatibility; live-shell and visual checks remain outstanding.

## Getting started

1. Discuss substantial changes before implementing them.
2. Keep changes focused and document relevant behavior and dependencies.
3. Run the checks applicable to your changes and describe their results.
4. Open a pull request describing the change and any remaining limitations.

Run the automated checks:

```sh
omarchy plugin validate "$PWD"
node --test tests/*.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
find . -name '*.qml' -type f -print0 | xargs -0 /usr/lib/qt6/bin/qmllint -I "$OMARCHY_PATH/shell"
```

Qt 6 lint can report unresolved host imports and dynamic shell types; investigate
its output rather than treating those warnings as a clean check. CI also runs a
Qt 5 syntax check and an advisory Qt 6 pass against the 4.5.0 shell source.
See the [development guide](https://plugins.omarchy.org/develop.html).
With permission to change the active shell, exercise panel and editor, bar-free
shortcut and monitor selection, save errors and conflicts, both languages,
disable/re-enable, restart and removal. Compare screenshots with the approved
design. The tests and static source checks are not substitutes for that work.

## Release preparation

Before publishing, ensure the README describes the actual functionality,
requirements, permissions, installation, and removal. Update the changelog,
validate the plugin, and follow the current
[publishing guide](https://plugins.omarchy.org/publish.html). The manifest
version, changelog, and release tag should agree.
Before tagging, add a released `## [X.Y.Z]` changelog heading and run
`python3 scripts/check_release.py vX.Y.Z`. Tag-triggered checks do not create a
release or publish anything; those actions require separate approval.

Never include credentials, personal notes, or other private data in commits,
logs, screenshots, or issue reports.
