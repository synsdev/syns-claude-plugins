#!/usr/bin/env python3
"""Render a self-contained Syns structure review from JSON data."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any


def esc(value: Any) -> str:
    return html.escape(str(value if value is not None else ""))


def rows(items: list[dict[str, Any]], cells: list[tuple[str, str]]) -> str:
    rendered = []
    for item in items:
        rendered.append("<tr>" + "".join(f'<td data-label="{esc(label)}">{esc(item.get(key, ""))}</td>' for key, label in cells) + "</tr>")
    return "".join(rendered) or f'<tr><td colspan="{len(cells)}"><em>None</em></td></tr>'


def facts(value: Any) -> str:
    if isinstance(value, dict):
        return "".join(f'<article><strong>{esc(k)}</strong><p>{esc(v)}</p></article>' for k, v in value.items())
    if isinstance(value, list):
        return "".join(f'<article><p>{esc(v)}</p></article>' for v in value)
    return f'<article><p>{esc(value)}</p></article>'


def tree(items: list[dict[str, Any]]) -> str:
    rendered = []
    current_band = None
    for item in items:
        band = item.get("band", "Repository")
        if band != current_band:
            rendered.append(f'<li class="tree-band"><span>{esc(band)}</span></li>')
            current_band = band
        origin = esc(item.get("origin", "neutral"))
        sources = item.get("sources", [])
        if isinstance(sources, list):
            sources = " · ".join(map(str, sources))
        rendered.append(
            f'<li class="tree-row origin-{origin}">'
            f'<code>{esc(item.get("path"))}</code>'
            f'<span>{esc(item.get("question"))}</span>'
            f'<span>{origin}</span>'
            f'<small>{esc(sources)}</small>'
            "</li>"
        )
    return "".join(rendered) or '<li class="tree-row"><em>No paths proposed</em></li>'


def validate(data: dict[str, Any]) -> None:
    source_paths = {str(x.get("path")) for x in data.get("sources", [])}
    mapped = {str(x.get("old")) for x in data.get("mapping", [])}
    missing = source_paths - mapped
    if missing:
        raise ValueError(f"every inventoried source needs a mapping disposition; missing: {', '.join(sorted(missing))}")


def render(data: dict[str, Any], template: str) -> str:
    validate(data)
    digests = data.get("digests", {})
    digest_html = "".join(f'<div><span>{esc(k)}</span><code>{esc(v)}</code></div>' for k, v in digests.items())
    candidates = rows(data.get("candidates", []), [("reference", "Reference"), ("mode", "Mode"), ("decision", "Decision"), ("reason", "Reason")])
    mapping = rows(data.get("mapping", []), [("old", "Current"), ("action", "Action"), ("new", "Proposed"), ("reason", "Reason")])
    unknowns = "".join(f"<li>{esc(x)}</li>" for x in data.get("unknowns", [])) or "<li>None recorded</li>"
    plan = data.get("evaluation_plan", {})
    if isinstance(plan, dict):
        plan = "".join(f'<div><strong>{esc(k)}</strong><span>{esc(v)}</span></div>' for k, v in plan.items())
    replacements = {
        "{{TITLE}}": esc(data.get("title", "Proposed Syns repository")),
        "{{SUMMARY}}": esc(data.get("summary", "Review the exact repository package before any files are written.")),
        "{{DISCLOSURE}}": esc(data.get("disclosure", "")),
        "{{DIGESTS}}": digest_html,
        "{{SOURCES}}": rows(data.get("sources", []), [("path", "Source"), ("kind", "Kind"), ("disposition", "Disposition")]),
        "{{WORK_MODEL}}": facts(data.get("work_model", {"Status": "Not established"})),
        "{{HISTORY}}": rows(data.get("history", []), [("evidence", "History evidence"), ("interpretation", "Interpretation"), ("limit", "Limit")]),
        "{{SYNS_REPOSITORIES}}": rows(data.get("syns_repositories", []), [("repository", "Repository"), ("decision", "Decision"), ("reason", "Reason"), ("boundary", "Boundary")]),
        "{{CANDIDATES}}": candidates,
        "{{TREE}}": tree(data.get("tree", [])),
        "{{MAPPING}}": mapping,
        "{{UNKNOWNS}}": unknowns,
        "{{EVALUATION_PLAN}}": str(plan),
        "{{FORM_ACTION}}": esc(data.get("form_action", "/decision")),
    }
    for marker, value in replacements.items():
        template = template.replace(marker, value)
    return template


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--template", type=Path, default=Path(__file__).resolve().parents[1] / "assets" / "structure-review-template.html")
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render(data, args.template.read_text()))
    print(args.output)


if __name__ == "__main__":
    main()
