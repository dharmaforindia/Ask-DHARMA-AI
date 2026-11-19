#!/usr/bin/env python3
"""Package the advocate-suite skills as .skill files for upload to the Claude app.

A .skill file is a zip archive with the skill folder at its root. The Claude app
accepts one skill per upload.

Usage:
    python3 scripts/package_advocate_skills.py [output_dir]

The default output directory is dist/advocate-skills/ (ignored by git).
"""
import sys
import zipfile
from pathlib import Path

SKILLS = [
    "senior-advocate",
    "legal-research-india",
    "legal-drafting-india",
    "practice-areas-india",
    "law-chamber-india",
]

repo_root = Path(__file__).resolve().parent.parent
skills_dir = repo_root / ".claude" / "skills"
out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else repo_root / "dist" / "advocate-skills"
out_dir.mkdir(parents=True, exist_ok=True)

for name in SKILLS:
    source = skills_dir / name
    if not (source / "SKILL.md").is_file():
        sys.exit(f"Missing {source / 'SKILL.md'}")
    target = out_dir / f"{name}.skill"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                archive.write(path, Path(name) / path.relative_to(source))
    print(f"Wrote {target}")
