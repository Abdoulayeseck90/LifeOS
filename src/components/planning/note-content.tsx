import ReactMarkdown from "react-markdown";
import type { ComponentPropsWithoutRef } from "react";

// Notes Reading Experience spec: renders a note's plain-text content as
// Markdown for reading, without changing how it's stored or edited
// (notes.content stays a plain string; note-form.tsx's textarea is
// untouched). Deliberately does NOT use remark-gfm (no tables/
// strikethrough/autolink extensions) — the existing editor is a plain
// textarea with no table-building UI, so a literal `|a|b|` in a note's
// text should render as plain text, not silently become a table the
// user never intended (spec: "do not introduce tables if the current
// editor does not support them"). Safe by construction: react-markdown
// never renders raw HTML found in the source text (no rehype-raw
// plugin), so there is no dangerouslySetInnerHTML anywhere in this
// component and nothing to sanitize separately — arbitrary note content
// can't inject a script tag or event handler.
//
// Headings are shifted down one level (markdown h1 -> rendered h2, etc.)
// so a note's own `# Heading` can never collide with the reading page's
// own <h1> (the note title) — keeps heading hierarchy semantically
// correct regardless of what level the author started at.
const HEADING_SHIFT: Record<string, string> = {
  h1: "h2",
  h2: "h3",
  h3: "h4",
  h4: "h5",
  h5: "h6",
  h6: "h6",
};

function makeHeading(tag: string) {
  const Tag = HEADING_SHIFT[tag] as keyof JSX.IntrinsicElements;
  return function Heading(props: ComponentPropsWithoutRef<"h1">) {
    return <Tag>{props.children}</Tag>;
  };
}

function ExternalLink(props: ComponentPropsWithoutRef<"a">) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

const MARKDOWN_COMPONENTS = {
  h1: makeHeading("h1"),
  h2: makeHeading("h2"),
  h3: makeHeading("h3"),
  h4: makeHeading("h4"),
  h5: makeHeading("h5"),
  h6: makeHeading("h6"),
  a: ExternalLink,
};

export function NoteContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm sm:prose-base max-w-none">
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}
