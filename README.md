# Omarchy Simplenote

An Omarchy shell plugin for one local plain-text note. It is unrelated to the
Simplenote service and does not sync or use an account.

## Status

The bar button opens a read-only note; its edit button opens a separate editor.
Edits are saved after a short pause and closing requests an immediate save.
Errors and conflicts stop saving and retain the unsaved text in memory while the
plugin is active. Retry is available after an error; conflict resolution is not
yet implemented. Omarchy 4.5 is the target, not a runtime compatibility claim:
the plugin has not yet been exercised in the live shell.

Omarchy plugins run without a sandbox, with the user's permissions. Review a
plugin and its dependencies before installing it.

## Data and limitations

The note is stored as plaintext at
`${XDG_CONFIG_HOME:-~/.config}/omarchy-simplenote/note.txt`; it is **not
encrypted** and is unsuitable for secrets. New files are created with mode
`0600` and the new data directory with `0700`, subject to existing directory
permissions. Python 3 and a Linux filesystem supporting `renameat2` exchange
are required. No root privileges or network access are needed.

Each replacement keeps the displaced file as `recovery-*.txt` in the same
directory. These files contain plaintext and are not deleted automatically.
If an error occurs during a replacement, a `.pending-*` file may also contain
a displaced version. At 32 recovery and pending files combined, saving pauses
with a visible error; unsaved edits remain in memory while the plugin is
active. To resume, first close external editors, inspect these files in the
data directory, deliberately remove copies you no longer need, and use Retry.
Deleting a recovery file can discard a late external change, so there is no
automatic cleanup. Removing the plugin does not remove this directory or its
contents. To delete the data deliberately, remove the directory yourself
after checking its contents.

The cap limits the number of files created by cooperating plugin helpers, not
the size of changes written later by other programs to their open file
descriptors. Such external writes can still exhaust disk space. The cap may
require cleanup after as few as 32 saves; this is a deliberate safety tradeoff,
not a rolling backup policy.

The helper checks the last-read revision before saving and retains the inode
displaced by an atomic exchange. If that inode differs, saving pauses with a
conflict and the external version is in a recovery file; the current note may
already contain the local version. External programs can hold old file
descriptors and write after the check, or replace the path after the plugin's
write: these changes cannot be reliably detected or coordinated with
uncooperative programs. A late write to the displaced inode remains in its
recovery file, but may not raise a warning. Do not edit the note externally
while using the plugin if that limitation is unacceptable. A conflict needs
manual recovery; preserve the visible unsaved text before disabling the plugin
or restarting the shell, because memory is not persistent.

Notes are limited to 1 MiB of UTF-8. Larger or invalid UTF-8 files report an
error rather than being overwritten.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). The
[Omarchy plugin development guide](https://plugins.omarchy.org/develop.html)
describes the plugin contract and validation tools.

## Releases

Changes are recorded in [CHANGELOG.md](CHANGELOG.md). No release is available
yet.

## License

This project is licensed under the [MIT License](LICENSE).
