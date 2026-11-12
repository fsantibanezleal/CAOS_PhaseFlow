#!/usr/bin/env python3
"""Generate field-level manuscript tables from the versioned contract catalog."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def tex(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$",
        "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}",
        "^": r"\textasciicircum{}", "~": r"\textasciitilde{}",
    }
    return "".join(replacements.get(character, character) for character in value)


def read_catalog(path: Path) -> dict[str, list[str]]:
    rows: dict[str, list[str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip().replace("`", "") for cell in line.strip("|").split("|")]
        if len(cells) == 13 and cells[0] not in {"id", "---"} and set(cells[0]) - {"-", ":"}:
            rows[cells[0]] = cells
    return rows


def type_name(schema: dict[str, Any]) -> str:
    if "type" in schema:
        value = schema["type"]
        return " or ".join(value) if isinstance(value, list) else value
    if "enum" in schema:
        return "enum"
    if "const" in schema:
        return "constant"
    if "$ref" in schema:
        return "object definition"
    return "object" if "properties" in schema else "JSON value"


def constraints(schema: dict[str, Any]) -> str:
    labels = {
        "format": "format", "pattern": "pattern", "minLength": "min length",
        "maxLength": "max length", "minimum": "minimum", "maximum": "maximum",
        "exclusiveMinimum": "exclusive minimum", "exclusiveMaximum": "exclusive maximum",
        "minItems": "min items", "maxItems": "max items", "minProperties": "min properties",
        "maxProperties": "max properties", "multipleOf": "multiple of",
    }
    parts = [f"{label}: {schema[key]}" for key, label in labels.items() if key in schema]
    for key in ("const", "enum"):
        if key in schema:
            value = schema[key]
            rendered = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            parts.append(f"{key}: {rendered}")
    if not parts:
        parts.append("no additional range declared")
    description = schema.get("description")
    if isinstance(description, str) and description.strip():
        parts.append(description.strip())
    return "; ".join(parts)


def unit_hint(path: str, schema: dict[str, Any]) -> str:
    description = schema.get("description")
    if isinstance(description, str) and re.search(r"\b(unit|seconds?|milliseconds?|tonnes?|tons?|grade|NPV|currency|USD|dollars?)\b", description, re.I):
        return description
    name = path.lower()
    if "sha256" in name or "digest" in name:
        return "64-character lowercase hexadecimal digest"
    if "bytes" in name:
        return "bytes"
    if name.endswith("_ms") or "runtime_ms" in name:
        return "milliseconds"
    if name.endswith("_seconds") or name.endswith("_s"):
        return "seconds"
    if any(key in name for key in ("npv", "value", "revenue", "cost")):
        return "case economic unit"
    if type_name(schema) == "integer":
        return "count"
    if type_name(schema) in {"boolean", "string", "enum", "constant"}:
        return "no physical unit"
    if any(key in name for key in ("tonnage", "capacity", "resource", "tonnes", "tons")):
        return "resource-specific input unit"
    if "grade" in name:
        return "input grade unit"
    if any(key in name for key in ("ratio", "fraction", "coverage", "rate", "normalized", "probability")):
        return "dimensionless"
    return "units not specified"


def schema_fields(schema: dict[str, Any]) -> list[tuple[str, dict[str, Any], bool]]:
    definitions = schema.get("$defs", schema.get("definitions", {}))
    fields: list[tuple[str, dict[str, Any], bool]] = []

    def resolve(node: dict[str, Any]) -> dict[str, Any]:
        ref = node.get("$ref")
        if not isinstance(ref, str) or not ref.startswith("#/"):
            return node
        current: Any = schema
        for token in ref[2:].split("/"):
            current = current.get(token, {}) if isinstance(current, dict) else {}
        return current if isinstance(current, dict) else node

    def walk(node: dict[str, Any], prefix: str, required: bool, visited: frozenset[str]) -> None:
        ref = node.get("$ref")
        if isinstance(ref, str) and ref in visited:
            fields.append((prefix, node, required))
            return
        resolved = resolve(node)
        visited = visited | ({ref} if isinstance(ref, str) else set())
        node = {**resolved, **{k: v for k, v in node.items() if k != "$ref"}}
        fields.append((prefix, node, required))
        for branch_key in ("allOf", "oneOf", "anyOf"):
            for index, branch in enumerate(node.get(branch_key, [])):
                walk(branch, f"{prefix} ({branch_key} {index + 1})", required, frozenset(visited))
        req = set(node.get("required", []))
        for key, child in node.get("properties", {}).items():
            walk(child, f"{prefix}.{key}" if prefix else key, key in req, frozenset(visited))
        if isinstance(node.get("items"), dict):
            walk(node["items"], f"{prefix}[]", False, frozenset(visited))

    if schema.get("properties") or any(key in schema for key in ("allOf", "oneOf", "anyOf", "items")):
        for key, child in schema.get("properties", {}).items():
            walk(child, key, key in set(schema.get("required", [])), frozenset())
        for branch_key in ("allOf", "oneOf", "anyOf"):
            for index, branch in enumerate(schema.get(branch_key, [])):
                walk(branch, f"$ ({branch_key} {index + 1})", True, frozenset())
        if isinstance(schema.get("items"), dict):
            walk(schema["items"], "$[]", False, frozenset())
    else:
        walk(schema, "$", True, frozenset())
    return fields


def observed_fields(root: Path, documents: str) -> list[tuple[str, str]]:
    paths = [part.strip() for part in documents.split(",")]
    result = []
    for item in paths:
        if "*" in item or item.startswith("!"):
            continue
        path = root / item
        if not path.is_file() or path.suffix != ".json":
            continue
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if isinstance(value, dict):
            for key, child in value.items():
                result.append((f"{path.name}.{key}", type(child).__name__))
    return result


def build(root: Path) -> None:
    catalog = read_catalog(root / "docs/contracts/catalog.md")
    lock = json.loads((root / "docs/contracts/versions.lock.json").read_text(encoding="utf-8"))
    rows = [
        r"\begingroup\small\setlength{\tabcolsep}{3pt}",
        r"\subsection{Field-level contract reference}",
        r"\label{sec:data-contract-fields}",
        "The tables below are generated from the catalog, locked versions, and JSON Schemas. Producer, consumer, and missing-data behavior reproduce the catalog entries. The field rows report JSON types, required status, declared structural constraints, and the physical-unit convention where it is encoded. For fields whose physical unit depends on a case, the table says so rather than assigning a unit not present in the schema.",
    ]
    for contract_id, catalog_row in catalog.items():
        version = lock[contract_id]["version"]
        owner, schema_rel, documents = catalog_row[2], catalog_row[3], catalog_row[5]
        missing = catalog_row[8]
        rows.extend([
            r"\begin{longtable}{>{\raggedright\arraybackslash}p{0.23\textwidth}>{\raggedright\arraybackslash}p{0.09\textwidth}>{\raggedright\arraybackslash}p{0.07\textwidth}>{\raggedright\arraybackslash}p{0.19\textwidth}>{\raggedright\arraybackslash}p{0.29\textwidth}}",
            rf"\caption{{Fields in the {tex(contract_id)} contract, version {tex(version)}.}}\label{{tab:contract-{tex(contract_id)}}}\\",
            r"\toprule Field & Type & Req. & Unit/domain & Constraints or meaning \\",
            r"\midrule\endfirsthead",
            r"\toprule Field & Type & Req. & Unit/domain & Constraints or meaning \\",
            r"\midrule\endhead",
        ])
        if schema_rel == "-":
            fields = []
        else:
            schema = json.loads((root / schema_rel).read_text(encoding="utf-8"))
            fields = schema_fields(schema)
        if fields and len(fields) == 1 and fields[0][0] == "$" and not fields[0][1].get("properties"):
            fields = []
        if fields:
            for path, node, required in fields:
                field = path
                rows.append(
                    rf"\path{{{field}}} & {tex(type_name(node))} & {'yes' if required else 'no'} & "
                    rf"{tex(unit_hint(path, node))} & {tex("four display categories; method names and case outcomes are listed directly" if path.endswith(".rung") else constraints(node))} \\")
        else:
            rows.append(r"No property-level schema is declared; see observed study document fields below. & object & - & mixed & The shared schema enforces only the outer object shape. \\")
            for path, kind in observed_fields(root, documents):
                rows.append(rf"\texttt{{{tex(path)}}} & {tex(kind)} & - & source-defined & Observed top-level field; shape is not constrained by the shared schema. \\")
        rows.extend([
            r"\bottomrule\end{longtable}",
            rf"\noindent\textbf{{Implementation:}} \path{{{owner}}}. \textbf{{Data provider:}} {tex(catalog_row[9])}.",
            rf"\textbf{{Documents:}} \path{{{documents}}}. \textbf{{Producer check:}} \path{{{catalog_row[6]}}}. \textbf{{Consumer check:}} \path{{{catalog_row[7]}}}. \textbf{{Missing-data behavior:}} {tex(missing)}.",
        ])
    rows.append(r"\endgroup")
    target = root / "manuscripts/_shared/generated/contract-reference.tex"
    target.write_text("\n".join(rows) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {target.relative_to(root)} for {len(catalog)} contracts.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root.resolve())
