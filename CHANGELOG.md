# Changelog

Notable changes to this project will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-20

### Added

- Single local plaintext note, read-only bar panel, and floating editor with
  autosave.
- English and Spanish interface translations and a localized About page.
- Editor open/toggle IPC commands for user-configured shortcuts.
- Copy-on-select in the panel and editor, with a short settle delay.
- Automatic rotation of normal note history and protected conflict copies.
- Installation, removal, data handling, recovery, and development documentation.

### Security

- Note contents and history remain plaintext in the user's config directory;
  no encryption, network access, or account is provided.
