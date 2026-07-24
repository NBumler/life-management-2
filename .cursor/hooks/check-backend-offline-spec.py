#!/usr/bin/env python3
"""Remind the agent if a documentation spec is missing #### Backend-offline."""

from __future__ import annotations

import json
import sys
from pathlib import Path

EXEMPT_NAMES = {
    "SPEC-TEMPLATE.md",
    "Backend-offline first.md",
}

REQUIRED_HEADING = "#### Backend-offline"


def repo_root() -> Path:
    # .cursor/hooks/<this file> → repo root is parents[2]
    return Path(__file__).resolve().parents[2]


def resolve_edited_path(payload: dict) -> Path | None:
    for key in ("file_path", "path", "filePath", "uri"):
        raw = payload.get(key)
        if isinstance(raw, str) and raw.strip():
            p = Path(raw)
            if not p.is_absolute():
                p = repo_root() / p
            return p
    # Nested shapes: afterFileEdit / postToolUse / tool_input
    for nest in ("file", "edit", "result", "tool_input", "input", "args"):
        inner = payload.get(nest)
        if isinstance(inner, dict):
            found = resolve_edited_path(inner)
            if found is not None:
                return found
    return None


def is_documentation_spec(path: Path) -> bool:
    try:
        rel = path.resolve().relative_to(repo_root().resolve())
    except ValueError:
        return False
    parts = rel.parts
    if not parts or parts[0] != "documentation":
        return False
    if path.suffix.lower() != ".md":
        return False
    if path.name in EXEMPT_NAMES:
        return False
    return True


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        return 0

    path = resolve_edited_path(payload if isinstance(payload, dict) else {})
    if path is None or not is_documentation_spec(path):
        print("{}")
        return 0

    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        print("{}")
        return 0

    if REQUIRED_HEADING in text:
        print("{}")
        return 0

    rel = path.as_posix()
    try:
        rel = str(path.resolve().relative_to(repo_root().resolve())).replace("\\", "/")
    except ValueError:
        pass

    msg = (
        f"A szerkesztett spec hiányolja a kötelező `#### Backend-offline` szekciót "
        f"a `### Frontend` alatt: `{rel}`. "
        f"Pótold most a documentation-spec skill szerint; SSOT: "
        f"`documentation/Architektúra/Backend-offline first.md`. "
        f"Exempt csak: SPEC-TEMPLATE.md és Backend-offline first.md."
    )
    print(json.dumps({"additional_context": msg}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
