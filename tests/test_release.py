import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "check_release", Path(__file__).resolve().parents[1] / "scripts/check_release.py"
)
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseCheckTests(unittest.TestCase):
    def test_matching_release(self):
        release.check("v1.2.3", {"version": "1.2.3"},
                      "## [Unreleased]\n## [1.2.3] - 2026-11-19\n")

    def test_rejects_mismatched_tag_and_unreleased_only(self):
        with self.assertRaises(ValueError):
            release.check("v1.2.4", {"version": "1.2.3"}, "## [1.2.3]\n")
        with self.assertRaises(ValueError):
            release.check("v1.2.3", {"version": "1.2.3"}, "## [Unreleased]\n")

    def test_rejects_partial_heading_and_nonstable_versions(self):
        with self.assertRaises(ValueError):
            release.check("v1.2.3", {"version": "1.2.3"}, "## [1.2.30]\n")
        with self.assertRaises(ValueError):
            release.check("v1.2.3-rc1", {"version": "1.2.3-rc1"}, "## [1.2.3-rc1]\n")
