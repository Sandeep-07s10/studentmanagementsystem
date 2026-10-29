#!/usr/bin/env python3
"""
Packages AcademiaSec Student Management project into a clean, distributable ZIP file.
Excludes node_modules, git directories, dist builds, and temporary files.
"""

import os
import zipfile

OUTPUT_ZIP = "academiasec-student-management.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    ".aistudio",
    "__pycache__",
}

EXCLUDE_EXTS = {
    ".zip",
    ".log",
    ".DS_Store",
}

def should_include_file(file_path):
    for part in file_path.split(os.sep):
        if part in EXCLUDE_DIRS:
            return False
    _, ext = os.path.splitext(file_path)
    if ext in EXCLUDE_EXTS:
        return False
    if os.path.basename(file_path) == "create_zip.py":
        return False
    return True

def create_project_zip():
    base_dir = os.path.abspath(".")
    count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zip_out:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                if should_include_file(rel_path):
                    zip_out.write(full_path, rel_path)
                    count += 1
                    print(f"Added: {rel_path}")

    size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"\nSuccessfully created {OUTPUT_ZIP} ({count} files, {size_kb:.2f} KB)")

if __name__ == "__main__":
    create_project_zip()
