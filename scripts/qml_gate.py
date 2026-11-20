#!/usr/bin/env python3
"""Gate categories that do not depend on resolving the dynamic shell host."""
from pathlib import Path
import subprocess
import sys

OPTIONS = [
    "--only-explicit-categories",
    "--syntax", "error",
    "--syntax.duplicate-ids", "error",
    "--duplicate-property-binding", "error",
    "--duplicate-import", "error",
    "--incompatible-type", "error",
    "--read-only-property", "error",
    "--unresolved-alias", "error",
]


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: qml_gate.py /path/to/qmllint /path/to/omarchy/shell")
    root = Path(__file__).resolve().parent.parent
    files = sorted(str(path) for path in root.rglob("*.qml") if ".git" not in path.parts)
    if not files:
        sys.exit("no QML files found")
    sys.exit(subprocess.call([sys.argv[1], *OPTIONS, "-I", sys.argv[2], *files]))


if __name__ == "__main__":
    main()
