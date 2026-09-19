---
title: "Markdown Skill"
description: "Project guidance for writing Markdown with useful front matter, clean block structure, and no unnecessary source-level line wrapping."
---

# Markdown Skill

Keep Markdown easy to edit and diff without inserting visual wrapping into the source.

## Front matter

- Every non-legacy project Markdown document must begin with YAML front matter containing non-empty `title` and `description` fields.
- Keep `title` and `description` values on one physical line each and make the description specific enough to identify the document's purpose.
- Preserve additional required metadata. In particular, formal `SKILL.md` files retain their `name` field alongside `title` and `description`.
- Place the opening `---` on the first line, close the front matter with `---`, and leave one blank line before the document body.
- Treat all Markdown inside `v0/` as read-only. Never add, remove, normalize, or reflow its content.

## Privacy and portability

- Do not include personal names, usernames, email addresses, home-directory paths, or other identifying information unless the user explicitly requires that exact public information.
- Use repository-relative paths instead of absolute machine paths. Use neutral placeholders when an example genuinely needs a home directory or username.
- Before handoff, check edited documentation for email addresses, usernames, home-directory paths, and other machine-specific locations.

## Line breaks

- Keep each prose paragraph on one physical line. Let the editor and renderer wrap it visually.
- Keep each heading, list item, numbered step, and blockquote paragraph on one physical line.
- When editing an existing paragraph or list item, remove unnecessary hard-wrapped continuation lines from that block.
- Use blank lines to separate actual Markdown blocks, not to control visual wrapping.
- Do not split a sentence before a link, path, inline code span, or short concluding phrase merely to meet a column width.

Bad:

```markdown
3. State any material assumption, especially while the target stack is
   undecided.
```

Good:

```markdown
3. State any material assumption, especially while the target stack is undecided.
```

## Valid exceptions

- Preserve line structure inside fenced or indented code blocks.
- Keep each Markdown table row on its own line.
- Use an explicit hard break only when the rendered line break is intentional; prefer structure such as a new paragraph or list item when that better expresses the meaning.
- Multi-block list items may contain separate paragraphs, code blocks, or nested lists, but their ordinary prose paragraphs still stay on one physical line.

## Scope

Make formatting changes only in Markdown files already in scope for the task. Do not reflow unrelated documentation solely because this skill was loaded.
