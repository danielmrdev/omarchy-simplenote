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
        self.assertEqual(self.note.read_text(), "local")
        self.assertEqual([p.read_text() for p in self.folder.glob("recovery-*.txt")], ["external"])

    def test_exchange_failure_does_not_modify_original(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        with patch.object(storage, "exchange", side_effect=OSError("unavailable")):
            with self.assertRaises(OSError):
                storage.run({"type": "write", "revision": baseline["revision"], "text": "local"})
        self.assertEqual(self.note.read_text(), "base")

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
        self.assertEqual([p.read_text() for p in self.folder.glob("recovery-*.txt")], ["old-late"])

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

    def test_recovery_limit_stops_saves_without_deleting_data_and_allows_retry(self):
        storage.run({"type": "read"})
        self.note.write_text("base")
        baseline = storage.run({"type": "read"})
        for number in range(storage.RECOVERY_LIMIT - 1):
            (self.folder / f"recovery-{number}.txt").write_text(f"old-{number}")
        pending = self.folder / ".pending-interrupted"
        pending.write_text("possibly displaced")
        request = {"type": "write", "revision": baseline["revision"], "text": "local"}
        self.assertEqual(storage.run(request), {"status": "error", "reason": "recovery_limit"})
        self.assertEqual(self.note.read_text(), "base")
        self.assertEqual(pending.read_text(), "possibly displaced")
        self.assertEqual(len(list(self.folder.glob("recovery-*.txt"))), storage.RECOVERY_LIMIT - 1)
        # Removing a reviewed copy is an explicit user decision.
        (self.folder / "recovery-0.txt").unlink()
        self.assertEqual(storage.run(request)["status"], "ok")
        self.assertEqual(self.note.read_text(), "local")
        self.assertEqual(len(list(self.folder.glob("recovery-*.txt"))), storage.RECOVERY_LIMIT - 1)
        self.assertEqual(pending.read_text(), "possibly displaced")


if __name__ == "__main__":
    unittest.main()
