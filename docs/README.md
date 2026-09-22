# docs/

Durable project reference material. **Committed to the repository on purpose.**

## Why this directory exists

Claude Code sessions run in ephemeral containers. A file attached to a chat
lives only as long as that session — the next session starts from a fresh
clone and cannot see it. Anything that must survive across sessions has to be
committed to git.

So: every planning document, phase roadmap, spec or design brief that a future
session needs to work from belongs in `docs/reference/`, committed.

## Layout

```
docs/
  README.md              this file
  reference/             source documents — PDFs, specs, briefs
```

## Adding a reference document

1. Put the file in `docs/reference/` with a descriptive, lowercase-hyphenated
   name (for example `build-phases.pdf`).
2. Commit it. An uncommitted file is a file the next session will not have.
3. If it is a PDF, also commit a Markdown transcription beside it — same
   basename, `.md` extension. PDFs are slow to read a page at a time, and the
   Markdown version is greppable, diffable and reviewable.

## Reading order for a new session

1. `CLAUDE.md` — binding project rules.
2. `docs/reference/` — the current phase roadmap and any active spec.

Reference documents describe *what to build*. They do not override `CLAUDE.md`,
and in particular they never relax the compliance language rules in its
section 3.
