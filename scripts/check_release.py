#!/usr/bin/env python3
"""Check a release tag against the manifest and a released changelog heading."""
import json
from pathlib import Path
import re
import sys


def check(tag, manifest, changelog):
    version = manifest["version"]
    if not isinstance(version, str) or not re.fullmatch(
        r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", version
    ):
        raise ValueError("manifest version must be a stable X.Y.Z version")
    if tag != "v" + version:
        raise ValueError("tag must match manifest version as vX.Y.Z")
    heading = re.compile(r"^## \[" + re.escape(version) + r"\](?: - \d{4}-\d{2}-\d{2})?\s*$", re.MULTILINE)
    if not heading.search(changelog):
        raise ValueError("changelog needs a released heading for " + version)


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: check_release.py vX.Y.Z")
        root = Path(__file__).resolve().parent.parent
        check(sys.argv[1], json.loads((root / "manifest.json").read_text()),
              (root / "CHANGELOG.md").read_text())
    except (OSError, ValueError, KeyError, TypeError) as error:
        sys.exit(str(error))
