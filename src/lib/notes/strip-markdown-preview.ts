// Cheap syntax-stripping for the Notes list preview — not a full parse
// (that's NoteContent's job, only used in the reading view). A list
// preview should read as plain text ("Research about the HVAC AI
// market...") rather than showing raw "# Research\n\n**HVAC**..."
// syntax, without paying for a full Markdown render on every item in
// the list.
export function stripMarkdownForPreview(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
