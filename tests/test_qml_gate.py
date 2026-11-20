import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "qml_gate", Path(__file__).resolve().parents[1] / "scripts/qml_gate.py"
)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
LINTER = Path("/usr/lib/qt6/bin/qmllint")


@unittest.skipUnless(LINTER.exists(), "Qt 6 qmllint not installed")
class QmlGateTests(unittest.TestCase):
    def lint(self, text):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "Fixture.qml"
            file.write_text(text)
            return subprocess.run([str(LINTER), *gate.OPTIONS, str(file)],
                                  capture_output=True, text=True)

    def test_clean_file_passes(self):
        self.assertEqual(self.lint("import QtQuick\nItem { width: 1 }\n").returncode, 0)

    def test_plugin_duplicate_binding_and_syntax_fail(self):
        self.assertNotEqual(self.lint("import QtQuick\nItem { width: 1; width: 2 }\n").returncode, 0)
        self.assertNotEqual(self.lint("import QtQuick\nItem { width: }\n").returncode, 0)
