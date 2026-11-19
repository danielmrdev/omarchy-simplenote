#!/usr/bin/env python3
"""Single-note storage. JSON requests arrive on stdin, never in argv."""
import ctypes
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
import sys

LIMIT = 1024 * 1024
HISTORY_LIMIT = 10
PROTECTED_LIMIT = 32
ABSENT = "absent"


class NoteTooLarge(ValueError):
    """The note or a protected recovery copy exceeds the safe read limit."""


def revision(data):
    return hashlib.sha256(data).hexdigest()


def directory():
    base = os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config")
    path = Path(base) / "omarchy-simplenote"
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    return path


def read_file(path):
    try:
        with path.open("rb") as stream:
            data = stream.read(LIMIT + 1)
        if len(data) > LIMIT:
            raise NoteTooLarge("note too large")
        return data
    except FileNotFoundError:
        return None


def exchange(first, second):
    libc = ctypes.CDLL(None, use_errno=True)
    rename = libc.renameat2
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(-100, os.fsencode(first), -100, os.fsencode(second), 2) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))


def run(request):
    folder = directory()
    # Serialize plugin helpers so the count check and creation form one
    # operation. This lock does not coordinate arbitrary external editors.
    lock_fd = os.open(folder / ".storage.lock", os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        return run_locked(folder, request)
    finally:
        os.close(lock_fd)


def run_locked(folder, request):
    path = folder / "note.txt"
    current = read_file(path)
    actual = ABSENT if current is None else revision(current)
    recovery = None
    if request.get("recovery"):
        name = request["recovery"]
        if not isinstance(name, str) or not re.fullmatch(r"conflict-[0-9]+-[0-9a-f]{8}\.txt", name):
            raise ValueError("invalid recovery name")
        recovery_path = folder / name
        if recovery_path.is_symlink():
            raise ValueError("invalid recovery file")
        recovery = read_file(recovery_path)
        if recovery is None:
            raise ValueError("missing recovery file")
    if request["type"] == "read":
        result = {"status": "ok", "text": "" if current is None else current.decode("utf-8"),
                  "revision": actual}
        if recovery is not None:
            result.update(recoveryText=recovery.decode("utf-8"), recoveryRevision=revision(recovery))
        return result
    if request["type"] != "write":
        raise ValueError("unknown request")
    if request["revision"] != actual:
        return {"status": "conflict"}
    if recovery is not None and request.get("recoveryRevision") != revision(recovery):
        return {"status": "conflict"}
    data = request["text"].encode("utf-8")
    if len(data) > LIMIT:
        return {"status": "error", "reason": "note_too_large"}
    # Interrupted operations and detected conflicts may hold unique data.
    # Never rotate those; bound them separately and report when full.
    protected = sum(1 for entry in folder.iterdir()
                    if entry.name.startswith(("conflict-", ".pending-")))
    if protected >= PROTECTED_LIMIT:
        return {"status": "error", "reason": "recovery_limit"}
    fd, temporary = tempfile.mkstemp(prefix=".pending-", dir=folder)
    temporary = Path(temporary)
    displaced_inode = False
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        if current is None:
            try:
                os.link(temporary, path)
            except FileExistsError:
                return {"status": "conflict"}
            temporary.unlink()
        else:
            try:
                exchange(temporary, path)
                displaced_inode = True
            except OSError as error:
                if error.errno == errno.ENOENT:
                    return {"status": "conflict"}
                raise
            # Classify as protected until the displaced revision is verified.
            suffix = "%d-%s.txt" % (time.time_ns(), os.urandom(4).hex())
            backup = folder / ("conflict-" + suffix)
            os.rename(temporary, backup)
            displaced_inode = False
            displaced = read_file(backup)
            if displaced is None or revision(displaced) != request["revision"]:
                return {"status": "conflict", "recovery": backup.name,
                        "writtenRevision": revision(data)}
            # Only files created by this history policy are eligible for
            # rotation. Legacy recovery files and interrupted/conflict copies
            # may contain unique versions and are left for manual inspection.
            history = [entry for entry in folder.iterdir()
                       if re.fullmatch(r"history-[0-9]+-[0-9a-f]{8}\.txt", entry.name)
                       and entry.is_file() and not entry.is_symlink()]
            history.sort(key=lambda entry: (int(entry.name.split("-")[1]), entry.name))
            for old in history[:max(0, len(history) - HISTORY_LIMIT + 1)]:
                old.unlink()
            os.rename(backup, folder / ("history-" + suffix))
        directory_fd = os.open(folder, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return {"status": "ok", "revision": revision(data)}
    finally:
        if not displaced_inode and temporary.exists():
            temporary.unlink()


def main():
    try:
        request = json.loads(sys.stdin.readline(LIMIT * 8 + 4096))
        print(json.dumps(run(request), ensure_ascii=True))
    except NoteTooLarge:
        print(json.dumps({"status": "error", "reason": "note_too_large"}))
    except (OSError, ValueError, KeyError, TypeError, UnicodeError):
        print(json.dumps({"status": "error"}))


if __name__ == "__main__":
    main()
