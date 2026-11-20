import importlib.util
import os
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("storage", Path(__file__).resolve().parents[1] / "storage.py")
storage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(storage)


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        environment = patch.dict(os.environ, {"XDG_CONFIG_HOME": self.temp.name})
        environment.start()
        self.addCleanup(environment.stop)
        self.folder = Path(self.temp.name) / "omarchy-simplenote"
        self.note = self.folder / "note.txt"

    def test_persist_and_restore_plain_text(self):
        original = storage.run({"type": "read"})
        self.assertEqual(original["revision"], storage.ABSENT)
        saved = storage.run({"type": "write", "revision": original["revision"], "text": "Hello\n<world> ñ"})
        self.assertEqual(saved["status"], "ok")
        self.assertEqual(storage.run({"type": "read"})["text"], "Hello\n<world> ñ")
        self.assertEqual(self.note.stat().st_mode & 0o777, 0o600)

    def test_external_change_before_save_stops_write(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        self.note.write_text("external")
        result = storage.run({"type": "write", "revision": baseline["revision"], "text": "local"})
        self.assertEqual(result["status"], "conflict")
        self.assertEqual(self.note.read_text(), "external")

    def test_change_during_exchange_is_retained_and_reported(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        original_exchange = storage.exchange

        def racing_exchange(first, second):
            second.write_text("external")
            original_exchange(first, second)

        with patch.object(storage, "exchange", racing_exchange):
            result = storage.run({"type": "write", "revision": baseline["revision"], "text": "local"})
        self.assertEqual(result["status"], "conflict")
        recovered = storage.run({"type": "read", "recovery": result["recovery"]})
        self.assertEqual(recovered["recoveryText"], "external")
        self.assertEqual(recovered["text"], "local")
        saved = storage.run({"type": "write", "text": recovered["recoveryText"],
                             "revision": recovered["revision"], "recovery": result["recovery"],
                             "recoveryRevision": recovered["recoveryRevision"]})
        self.assertEqual(saved["status"], "ok")
        self.assertEqual(self.note.read_text(), "external")
        self.assertEqual([p.read_text() for p in self.folder.glob("conflict-*.txt")], ["external"])

    def test_exchange_failure_does_not_modify_original(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        with patch.object(storage, "exchange", side_effect=OSError("unavailable")):
            with self.assertRaises(OSError):
                storage.run({"type": "write", "revision": baseline["revision"], "text": "local"})
        self.assertEqual(self.note.read_text(), "base")

    def test_resolution_rejects_changes_to_either_observed_version(self):
        storage.run({"type": "read"})
        self.note.write_text("local")
        recovery = self.folder / "conflict-123-01234567.txt"
        recovery.write_text("external")
        observed = storage.run({"type": "read", "recovery": recovery.name})
        request = {"type": "write", "text": "local", "revision": observed["revision"],
                   "recovery": recovery.name, "recoveryRevision": observed["recoveryRevision"]}
        recovery.write_text("external changed")
        self.assertEqual(storage.run(request)["status"], "conflict")
        self.assertEqual(self.note.read_text(), "local")
        request["recoveryRevision"] = storage.revision(b"external changed")
        self.note.write_text("new disk change")
        self.assertEqual(storage.run(request)["status"], "conflict")
        self.assertEqual(self.note.read_text(), "new disk change")
        self.assertEqual(recovery.read_text(), "external changed")

    def test_recovery_path_must_be_valid_and_not_a_symlink(self):
        storage.run({"type": "read"})
        with self.assertRaises(ValueError):
            storage.run({"type": "read", "recovery": "../note.txt"})
        (self.folder / "conflict-123-01234567.txt").symlink_to(self.note)
        with self.assertRaises(ValueError):
            storage.run({"type": "read", "recovery": "conflict-123-01234567.txt"})

    def test_second_save_retains_displaced_inode(self):
        storage.run({"type": "read"})
        self.note.write_text("old")
        handle = self.note.open("a")
        self.addCleanup(handle.close)
        baseline = storage.run({"type": "read"})
        result = storage.run({"type": "write", "revision": baseline["revision"], "text": "new"})
        handle.write("-late")
        handle.flush()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(self.note.read_text(), "new")
        self.assertEqual([p.read_text() for p in self.folder.glob("history-*.txt")], ["old-late"])

    def test_subprocess_protocol_persists_across_processes(self):
        def request(payload):
            result = subprocess.run(
                [sys.executable, str(Path(storage.__file__))],
                input=json.dumps(payload) + "\n",
                text=True, capture_output=True, check=True,
            )
            return json.loads(result.stdout)

        initial = request({"type": "read"})
        result = request({"type": "write", "revision": initial["revision"], "text": "line 1\nline 2"})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(request({"type": "read"})["text"], "line 1\nline 2")

    def test_utf8_byte_limit_and_oversize_preserves_file(self):
        initial = storage.run({"type": "read"})
        exact = "ñ" * (storage.LIMIT // 2)
        saved = storage.run({"type": "write", "revision": initial["revision"], "text": exact})
        self.assertEqual(saved["status"], "ok")
        self.assertEqual(len(self.note.read_bytes()), storage.LIMIT)
        self.assertEqual(storage.run({"type": "read"})["text"], exact)
        result = storage.run({"type": "write", "revision": saved["revision"], "text": exact + "a"})
        self.assertEqual(result, {"status": "error", "reason": "note_too_large"})
        self.assertEqual(self.note.read_text(), exact)
        self.assertEqual(list(self.folder.glob(".pending-*")), [])

    def test_subprocess_reports_oversized_disk_and_recovery_without_stderr(self):
        storage.run({"type": "read"})
        self.note.write_bytes(b"a" * (storage.LIMIT + 1))
        def request(payload):
            return subprocess.run([sys.executable, str(Path(storage.__file__))],
                                  input=json.dumps(payload) + "\n", text=True,
                                  capture_output=True, check=True)
        result = request({"type": "read"})
        self.assertEqual(json.loads(result.stdout), {"status": "error", "reason": "note_too_large"})
        self.assertEqual(result.stderr, "")
        self.assertEqual(self.note.stat().st_size, storage.LIMIT + 1)
        self.note.write_text("intact")
        recovery = self.folder / "conflict-123-01234567.txt"
        recovery.write_bytes(b"b" * (storage.LIMIT + 1))
        result = request({"type": "read", "recovery": recovery.name})
        self.assertEqual(json.loads(result.stdout), {"status": "error", "reason": "note_too_large"})
        self.assertEqual(result.stderr, "")
        self.assertEqual(self.note.read_text(), "intact")
        self.assertEqual(recovery.stat().st_size, storage.LIMIT + 1)

    def test_subprocess_oversized_write_returns_structured_error(self):
        initial = storage.run({"type": "read"})
        saved = storage.run({"type": "write", "revision": initial["revision"], "text": "safe"})
        result = subprocess.run([sys.executable, str(Path(storage.__file__))],
                                input=json.dumps({"type": "write", "revision": saved["revision"],
                                                  "text": "ñ" * (storage.LIMIT // 2) + "a"}) + "\n",
                                text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), {"status": "error", "reason": "note_too_large"})
        self.assertEqual(result.stderr, "")
        self.assertEqual(self.note.read_text(), "safe")

    def test_protected_limit_stops_saves_without_deleting_data_and_allows_retry(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        for number in range(storage.PROTECTED_LIMIT - 1):
            (self.folder / f"conflict-{number}.txt").write_text(f"old-{number}")
        pending = self.folder / ".pending-interrupted"
        pending.write_text("possibly displaced")
        request = {"type": "write", "revision": baseline["revision"], "text": "local"}
        self.assertEqual(storage.run(request), {"status": "error", "reason": "recovery_limit"})
        self.assertEqual(self.note.read_text(), "base")
        self.assertEqual(pending.read_text(), "possibly displaced")
        self.assertEqual(len(list(self.folder.glob("conflict-*.txt"))), storage.PROTECTED_LIMIT - 1)
        # Removing a reviewed copy is an explicit user decision.
        (self.folder / "conflict-0.txt").unlink()
        self.assertEqual(storage.run(request)["status"], "ok")
        self.assertEqual(self.note.read_text(), "local")
        self.assertEqual(len(list(self.folder.glob("conflict-*.txt"))), storage.PROTECTED_LIMIT - 2)
        self.assertEqual(pending.read_text(), "possibly displaced")

    def test_many_saves_rotate_only_normal_history(self):
        result = storage.run({"type": "read"})
        for number in range(75):
            result = storage.run({"type": "write", "revision": result["revision"], "text": f"note-{number}"})
            self.assertEqual(result["status"], "ok")
        self.assertEqual(self.note.read_text(), "note-74")
        history = list(self.folder.glob("history-*.txt"))
        self.assertEqual(len(history), storage.HISTORY_LIMIT)
        self.assertEqual({p.read_text() for p in history}, {f"note-{n}" for n in range(64, 74)})

    def test_conflicts_pending_and_legacy_copies_survive_rotation(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        exchange = storage.exchange

        def racing_exchange(first, second):
            second.write_text("external")
            exchange(first, second)

        with patch.object(storage, "exchange", racing_exchange):
            self.assertEqual(storage.run({"type": "write", "revision": baseline["revision"], "text": "local"})["status"], "conflict")
        pending = self.folder / ".pending-interrupted"
        pending.write_text("pending")
        legacy = self.folder / "recovery-123-01234567.txt"
        legacy.write_text("legacy")
        current = storage.run({"type": "read"})
        for number in range(40):
            current = storage.run({"type": "write", "revision": current["revision"], "text": str(number)})
            self.assertEqual(current["status"], "ok")
        self.assertEqual([p.read_text() for p in self.folder.glob("conflict-*.txt")], ["external"])
        self.assertEqual(pending.read_text(), "pending")
        self.assertEqual(legacy.read_text(), "legacy")
        self.assertEqual(len(list(self.folder.glob("history-*.txt"))), storage.HISTORY_LIMIT)

    def test_late_write_to_rotated_inode_is_not_recoverable_from_history(self):
        first = storage.run({"type": "read"})
        saved = storage.run({"type": "write", "revision": first["revision"], "text": "initial"})
        handle = self.note.open("a")
        self.addCleanup(handle.close)
        for number in range(storage.HISTORY_LIMIT + 2):
            saved = storage.run({"type": "write", "revision": saved["revision"], "text": str(number)})
            self.assertEqual(saved["status"], "ok")
        handle.write("-late-external")
        handle.flush()
        self.assertEqual(self.note.read_text(), str(storage.HISTORY_LIMIT + 1))
        self.assertFalse(any("-late-external" in p.read_text() for p in self.folder.glob("history-*.txt")))


if __name__ == "__main__":
    unittest.main()
