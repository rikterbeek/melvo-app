"""Structural tests for the root index.html (RFC-1 §5.1, ADR-001 §4).

Run with:  python3 -m unittest discover -s tests -v

These tests parse the file with the standard library only: the site itself must
stay dependency-free, so its test harness does too.
"""

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX = REPO_ROOT / "index.html"

FORBIDDEN_TAGS = ("script", "link", "img", "iframe", "style", "object", "embed")


class Node:
    """Minimal element node: tag name, attributes, children, collected text."""

    def __init__(self, tag, attrs=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.children = []
        self.text = ""

    def find(self, tag):
        """First descendant with this tag, depth-first, or None."""
        for child in self.children:
            if child.tag == tag:
                return child
            found = child.find(tag)
            if found is not None:
                return found
        return None

    def find_all(self, tag):
        found = []
        for child in self.children:
            if child.tag == tag:
                found.append(child)
            found.extend(child.find_all(tag))
        return found


class DocumentParser(HTMLParser):
    """Builds a tree of Nodes and records the doctype declaration."""

    VOID = {"meta", "br", "hr", "img", "input", "link", "source", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#document")
        self.stack = [self.root]
        self.doctype = None

    def handle_decl(self, decl):
        self.doctype = decl

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data):
        self.stack[-1].text += data


def parse(source):
    parser = DocumentParser()
    parser.feed(source)
    parser.close()
    return parser


class IndexHtmlTest(unittest.TestCase):
    """Intent: AC-1..AC-5 — the single root page is a valid, self-contained
    HTML5 document that renders "Hello, world!" with browser defaults only."""

    @classmethod
    def setUpClass(cls):
        cls.exists = INDEX.is_file()
        cls.source = INDEX.read_text(encoding="utf-8") if cls.exists else ""
        cls.parser = parse(cls.source) if cls.exists else None

    def setUp(self):
        if not self.exists:
            self.fail(f"index.html is missing at the repository root ({INDEX})")

    def html(self):
        node = self.parser.root.find("html")
        self.assertIsNotNone(node, "document has no <html> element")
        return node

    # AC-1 — index.html exists at the repository root and is the only page.

    def test_index_html_is_the_only_page_at_the_repository_root(self):
        pages = sorted(p.name for p in REPO_ROOT.glob("*.htm*"))
        self.assertEqual(["index.html"], pages)

    # AC-2 — doctype, lang, charset, viewport, non-empty title.

    def test_doctype_html_is_the_first_line(self):
        self.assertEqual("<!DOCTYPE html>", self.source.splitlines()[0])
        self.assertEqual("DOCTYPE html", self.parser.doctype)

    def test_root_element_declares_english(self):
        self.assertEqual("en", self.html().attrs.get("lang"))

    def test_charset_meta_is_the_first_child_of_head(self):
        head = self.html().find("head")
        self.assertIsNotNone(head, "document has no <head> element")
        self.assertTrue(head.children, "<head> is empty")
        first = head.children[0]
        self.assertEqual("meta", first.tag)
        self.assertEqual("utf-8", (first.attrs.get("charset") or "").lower())

    def test_viewport_meta_is_present(self):
        metas = self.html().find_all("meta")
        viewport = [m for m in metas if m.attrs.get("name") == "viewport"]
        self.assertEqual(1, len(viewport), "expected exactly one viewport meta")
        self.assertEqual(
            "width=device-width, initial-scale=1",
            viewport[0].attrs.get("content"),
        )

    def test_title_is_non_empty_and_reads_hello_world(self):
        title = self.html().find("title")
        self.assertIsNotNone(title, "document has no <title> element")
        self.assertEqual("Hello, world!", title.text.strip())

    # AC-3 — opening the file renders "Hello, world!" with an empty console.

    def test_body_contains_a_single_h1_saying_hello_world(self):
        body = self.html().find("body")
        self.assertIsNotNone(body, "document has no <body> element")
        headings = body.find_all("h1")
        self.assertEqual(1, len(headings), "expected exactly one <h1>")
        self.assertEqual("Hello, world!", headings[0].text.strip())
        self.assertEqual(
            ["h1"],
            [child.tag for child in body.children],
            "<body> must contain the heading and nothing else",
        )

    def test_document_has_no_scripts_so_the_console_stays_empty(self):
        for tag in FORBIDDEN_TAGS:
            self.assertEqual(
                [],
                self.parser.root.find_all(tag),
                f"<{tag}> is not allowed in a self-contained page",
            )

    # AC-4 — zero subresource references.

    def test_document_references_no_external_urls(self):
        self.assertIsNone(
            re.search(r"https?://", self.source),
            "index.html must not reference any http(s) URL",
        )

    def test_document_carries_no_css(self):
        self.assertIsNone(
            re.search(r"@import", self.source), "@import is not allowed"
        )

    def test_no_element_carries_an_inline_style_attribute(self):
        def walk(node):
            for child in node.children:
                self.assertNotIn(
                    "style",
                    child.attrs,
                    f"<{child.tag}> carries an inline style attribute",
                )
                walk(child)

        walk(self.parser.root)

    # AC-5 — renders legibly with no horizontal scroll at 375 px and ≥ 1280 px.
    #
    # With browser defaults and no fixed widths, block-level text reflows to the
    # viewport at any width; the viewport meta stops mobile browsers applying a
    # 980 px fallback layout. We assert the two static preconditions here; the
    # visual check at 375 px and 1280 px is a manual/QA step.

    def test_no_fixed_pixel_widths_can_force_horizontal_scroll(self):
        declared = re.findall(r"width\s*=\s*[\"']([^\"']+)[\"']", self.source)
        self.assertEqual(
            [],
            [w for w in declared if w.strip().isdigit()],
            "no element may declare a fixed pixel width",
        )

    def test_the_page_needs_no_build_tooling(self):
        self.assertFalse(
            (REPO_ROOT / "package.json").exists(),
            "ADR-001 §4 forbids build tooling for this site",
        )


if __name__ == "__main__":
    unittest.main()
