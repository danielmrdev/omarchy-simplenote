# Changelog

Notable changes to this project will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project documentation.
- Preliminary bar note panel, editor and local plaintext persistence, pending
  live-shell verification.
- Automatic rotation of normal note history, with detected conflicts retained
  separately for manual recovery.
- Editor open and toggle IPC commands for user-configured shortcuts; the shared
  service owns the editor independently of the bar widget.
- Copy-on-select in the read-only panel and the editor, with a short settle delay
  before the selection reaches the clipboard.
