import { describe, it, expect } from "vitest";
import { stripMarkdownForPreview } from "@/lib/notes/strip-markdown-preview";

describe("stripMarkdownForPreview", () => {
  it("strips heading markers", () => {
    expect(stripMarkdownForPreview("# My Project Research")).toBe("My Project Research");
  });

  it("strips bold and italic markers", () => {
    expect(stripMarkdownForPreview("This is **bold** and *italic* text")).toBe("This is bold and italic text");
  });

  it("strips list markers", () => {
    expect(stripMarkdownForPreview("- first\n- second")).toBe("first second");
  });

  it("strips blockquote markers", () => {
    expect(stripMarkdownForPreview("> a quote")).toBe("a quote");
  });

  it("strips inline code and code fences", () => {
    expect(stripMarkdownForPreview("Use `npm install` to set up")).toBe("Use npm install to set up");
    expect(stripMarkdownForPreview("Before\n```\nconst x = 1;\n```\nAfter")).toBe("Before After");
  });

  it("keeps link text, drops the URL", () => {
    expect(stripMarkdownForPreview("See [the docs](https://example.com) for more")).toBe("See the docs for more");
  });

  it("leaves plain prose with no markdown syntax unchanged", () => {
    expect(stripMarkdownForPreview("Research about the HVAC AI market and potential customer segments.")).toBe(
      "Research about the HVAC AI market and potential customer segments."
    );
  });
});
