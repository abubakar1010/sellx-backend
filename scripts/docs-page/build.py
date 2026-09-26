"""Builds the shareable HTML reference from docs/listing-forms-api.md.

    python scripts/docs-page/build.py

The markdown is the source of truth; this only re-skins it, so the page and the
doc can never drift. The converter is tuned to this document: tables, fenced
code, mermaid, lists, blockquotes, task lists and the inline spans it uses.

Publish the output as an Artifact to share it with the client team.
"""
import html
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(REPO, "docs", "listing-forms-api.md")
SHELL = os.path.join(HERE, "shell.html")
OUT = os.path.join(REPO, "docs", "frontend", "listing-forms-reference.html")


def slugify(text):
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"\s", "-", text)


# ---------------------------------------------------------------- inline spans

def inline(text):
    """Markdown spans -> HTML. Code first so its contents are never re-parsed."""
    tokens = []

    def stash(markup):
        tokens.append(markup)
        return f"\x00{len(tokens) - 1}\x00"

    def code(match):
        return stash(f"<code>{html.escape(match.group(1))}</code>")

    text = re.sub(r"`([^`]+)`", code, text)
    text = html.escape(text)

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"<em>\1</em>", text)
    text = text.replace(r"\|", "|")

    for i, markup in enumerate(tokens):
        text = text.replace(f"\x00{i}\x00", markup)
    return text


REQUIRED_CELL = re.compile(r"^(?:<strong>)?(?:✔|✓)(?:</strong>)?$")


def cell(text, is_required_column):
    """Required-ness reads better as a chip than a tick in a column of ticks."""
    rendered = inline(text)
    if not is_required_column:
        return rendered
    bare = rendered.strip()
    if REQUIRED_CELL.match(bare):
        emphatic = "<strong>" in bare
        cls = "chip chip-required" + (" chip-strong" if emphatic else "")
        return f'<span class="{cls}">required</span>'
    if bare in {"–", "-", "—", ""}:
        return '<span class="chip chip-optional">optional</span>'
    if "conditional" in bare.lower():
        return '<span class="chip chip-conditional">conditional</span>'
    if "varies" in bare.lower():
        return '<span class="chip chip-conditional">varies</span>'
    if "on create" in bare.lower():
        return '<span class="chip chip-conditional">on create</span>'
    return rendered


# ---------------------------------------------------------------- block parser

class Converter:
    def __init__(self, lines):
        self.lines = lines
        self.i = 0
        self.out = []
        self.nav = []
        self.enum_tables = 0

    def peek(self, offset=0):
        j = self.i + offset
        return self.lines[j] if j < len(self.lines) else None

    def run(self):
        while self.i < len(self.lines):
            line = self.lines[self.i]

            if not line.strip():
                self.i += 1
            elif line.startswith("```"):
                self.fence()
            elif line.startswith("#"):
                self.heading()
            elif line.startswith("|"):
                self.table()
            elif re.match(r"^\s*(?:[-*]|\d+\.)\s+", line):
                self.list_block()
            elif line.startswith(">"):
                self.quote()
            elif line.strip() == "---":
                self.i += 1  # rules are carried by section spacing instead
            else:
                self.paragraph()
        return self

    # -- blocks ------------------------------------------------------------
    def fence(self):
        lang = self.lines[self.i][3:].strip()
        self.i += 1
        body = []
        while self.i < len(self.lines) and not self.lines[self.i].startswith("```"):
            body.append(self.lines[self.i])
            self.i += 1
        self.i += 1
        source = "\n".join(body)

        if lang == "mermaid":
            self.out.append(f'<pre class="mermaid">{html.escape(source)}</pre>')
            return

        escaped = html.escape(source)
        label = {"json": "JSON", "ts": "TypeScript", "bash": "Shell"}.get(lang, lang or "")
        head = f'<span class="code-lang">{label}</span>' if label else ""
        self.out.append(
            '<figure class="code">'
            f'<figcaption>{head}'
            '<button class="copy" type="button" data-copy>Copy</button>'
            "</figcaption>"
            f'<pre><code class="lang-{lang or "text"}">{escaped}</code></pre>'
            "</figure>"
        )

    def heading(self):
        line = self.lines[self.i]
        self.i += 1
        level = len(line) - len(line.lstrip("#"))
        text = line[level:].strip()
        anchor = slugify(text)
        rendered = inline(text)

        if level == 1:
            return  # the page furniture carries the title

        if anchor == "table-of-contents":
            self.skip_to_next_h2()
            return

        if level in (2, 3):
            self.nav.append((level, anchor, re.sub(r"<[^>]+>", "", rendered)))

        self.out.append(f'<h{level} id="{anchor}">{rendered}</h{level}>')

    def skip_to_next_h2(self):
        while self.i < len(self.lines) and not self.lines[self.i].startswith("## "):
            self.i += 1

    def table(self):
        rows = []
        while self.i < len(self.lines) and self.lines[self.i].startswith("|"):
            rows.append(self.lines[self.i])
            self.i += 1
        if len(rows) < 2:
            return

        def split(row):
            return [c.strip() for c in re.split(r"(?<!\\)\|", row.strip())[1:-1]]

        header = split(rows[0])
        body = [split(r) for r in rows[2:]]
        required_col = next(
            (n for n, h in enumerate(header) if h.strip().lower() == "required"), None
        )
        is_enum = header[:3] == ["Value", "English", "Norsk"]
        if is_enum:
            self.enum_tables += 1

        cls = "table enum-table" if is_enum else "table"
        out = [f'<div class="rail"><table class="{cls}"><thead><tr>']
        out += [f"<th>{inline(h)}</th>" for h in header]
        out.append("</tr></thead><tbody>")
        for row in body:
            out.append("<tr>")
            for n, value in enumerate(row):
                out.append(f"<td>{cell(value, n == required_col)}</td>")
            out.append("</tr>")
        out.append("</tbody></table></div>")
        self.out.append("".join(out))

    def list_block(self):
        first = self.lines[self.i]
        ordered = bool(re.match(r"^\s*\d+\.\s+", first))
        base_indent = len(first) - len(first.lstrip())
        items = []

        while self.i < len(self.lines):
            line = self.lines[self.i]
            match = re.match(r"^(\s*)(?:[-*]|\d+\.)\s+(.*)$", line)
            if not match or len(match.group(1)) < base_indent:
                if line.strip() and not line.startswith("|") and items and line.startswith("  "):
                    items[-1] += " " + line.strip()
                    self.i += 1
                    continue
                break
            items.append(match.group(2))
            self.i += 1

        tag = "ol" if ordered else "ul"
        rendered = []
        checklist = all(item.startswith(("[ ]", "[x]")) for item in items) and items
        for item in items:
            if checklist:
                item = re.sub(r"^\[[ x]\]\s*", "", item)
                rendered.append(f'<li><span class="tick" aria-hidden="true"></span>{inline(item)}</li>')
            else:
                rendered.append(f"<li>{inline(item)}</li>")
        cls = ' class="checklist"' if checklist else ""
        self.out.append(f"<{tag}{cls}>{''.join(rendered)}</{tag}>")

    def quote(self):
        body = []
        while self.i < len(self.lines) and self.lines[self.i].startswith(">"):
            body.append(self.lines[self.i].lstrip(">").strip())
            self.i += 1
        self.out.append(f'<blockquote><p>{inline(" ".join(body))}</p></blockquote>')

    def paragraph(self):
        body = []
        while self.i < len(self.lines):
            line = self.lines[self.i]
            if (not line.strip() or line.startswith(("#", "|", ">", "```"))
                    or re.match(r"^\s*(?:[-*]|\d+\.)\s+", line) or line.strip() == "---"):
                break
            body.append(line.strip())
            self.i += 1
        if body:
            self.out.append(f'<p>{inline(" ".join(body))}</p>')


# ------------------------------------------------------- post-processing pass

def collapse_enum_sections(body):
    """Wrap each `#### <enum>` block in the option reference in a <details> card."""
    pattern = re.compile(
        r'(<h4 id="([^"]+)">(.*?)</h4>)(.*?)(?=<h4 id="|<h2 id="|$)', re.S
    )

    def wrap(match):
        _, anchor, title, content = match.groups()
        if 'class="rail"><table class="table enum-table"' not in content:
            return match.group(0)
        count = content.count("<tr>") - content.count("<thead>")
        return (
            f'<details class="enum" id="{anchor}">'
            f'<summary><span class="enum-name">{title}</span>'
            f'<span class="enum-count">{count} values</span></summary>'
            f'<div class="enum-body">{content}</div>'
            "</details>"
        )

    start = body.find('<h2 id="option-value-reference">')
    if start == -1:
        return body
    end = body.find('<h2 id="typescript-constants">')
    section = body[start:end]
    return body[:start] + pattern.sub(wrap, section) + body[end:]


def build_nav(nav):
    out = ['<nav class="toc" aria-label="Sections">']
    for level, anchor, text in nav:
        cls = "toc-2" if level == 2 else "toc-3"
        out.append(f'<a class="{cls}" href="#{anchor}" data-nav="{anchor}">{html.escape(text)}</a>')
    out.append("</nav>")
    return "".join(out)


def main():
    md = io.open(SRC, encoding="utf-8").read()
    converter = Converter(md.split("\n")).run()
    body = collapse_enum_sections("".join(converter.out))
    nav = build_nav(converter.nav)

    shell = io.open(SHELL, encoding="utf-8").read()
    page = shell.replace("<!--NAV-->", nav).replace("<!--BODY-->", body)

    io.open(OUT, "w", encoding="utf-8", newline="\n").write(page)

    print(f"wrote {OUT}")
    print(f"  nav entries: {len(converter.nav)}")
    print(f"  enum tables: {converter.enum_tables}")
    print(f"  bytes: {len(page):,}")
    leftover = re.findall(r"<!--[A-Z_]+-->", page)
    if leftover:
        print(f"  UNRESOLVED PLACEHOLDERS: {leftover}", file=sys.stderr)
        sys.exit(1)


main()
