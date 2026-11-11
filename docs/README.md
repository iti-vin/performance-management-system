# .docs/

Project documentation for PMS (NestJS property/records management service).

Place project-level Markdown files here:

- `architecture.md` - system design, module boundaries, data flow
- `api.md` - endpoint reference, request/response examples
- `database.md` - schema, entities, migration notes
- `operations.md` - deployment, environment variables, monitoring
- `decisions/` - architecture decision records (ADR)

## Conventions

- One topic per file, kebab-case names.
- Update docs when the feature they describe changes.
- Do not put secrets in docs. Reference `.env.example` instead.

## Related

- `CLAUDE.md` - agent instructions (Sauron managed)
- `.claude/docs/` - reference docs Claude reads on demand
