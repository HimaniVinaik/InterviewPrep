#!/usr/bin/env python3
"""Add a bookmark outline (the sidebar table of contents in PDF readers) to a PrepForge PDF.

Usage: pdf_outline.py <pdf> <outline.json>
outline.json is a list of {"title", "page" (1-based), "level" (0 = part, 1 = chapter, 2 = problem)}
in reading order. Written by tools/build-pdf.js; needs `pip install pypdf`.
The PDF is rewritten in place; text, links and pages are unchanged.
"""
import json
import os
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import Fit


def main(pdf_path, outline_path):
    with open(outline_path, encoding="utf-8") as f:
        entries = json.load(f)
    reader = PdfReader(pdf_path)
    writer = PdfWriter(clone_from=reader)
    pages = len(writer.pages)
    parents = {}  # level -> most recent bookmark at that level
    for e in entries:
        level, page = int(e["level"]), int(e["page"])
        if not 1 <= page <= pages:
            sys.exit(f"bookmark '{e['title']}' points at page {page}, but the PDF has {pages}")
        parent = None
        for up in range(level - 1, -1, -1):  # nearest shallower bookmark
            if up in parents:
                parent = parents[up]
                break
        item = writer.add_outline_item(e["title"], page - 1, parent=parent, fit=Fit.fit_horizontally(top=None))
        parents[level] = item
        for deeper in [k for k in parents if k > level]:
            del parents[deeper]
    writer.page_mode = "/UseOutlines"  # open with the bookmarks panel where the reader supports it
    tmp = pdf_path + ".tmp"
    with open(tmp, "wb") as f:
        writer.write(f)
    os.replace(tmp, pdf_path)
    print(f"added {len(entries)} bookmarks")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
