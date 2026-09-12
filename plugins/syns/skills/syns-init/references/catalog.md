# The pinned structure shelf

The setup skill uses this compact catalog before it reads any full example. These are **Syns-authored, internally checked references**, not customer-proven templates and not a marketplace.

| Reference | Commit | Mode | Adopt when | Do not claim |
| --- | --- | --- | --- | --- |
| `bartsoj/ticks-engineering-work` | `000dfbef291d50cde86aa942697909352f3dfd05` | shape-only | Small engineering queues where dependency waves, waiting, review, and explicit blockers are central | `tk` compatibility or native ticks operation |
| `bartsoj/linear-engineering-work` | `e54bb495634698f6485a8e884277cf855552d070` | shape-only | Engineering delivery organized as issues → projects → initiatives, with milestones, cycles, updates, and documents | Linear import, synchronization, realtime UI, permissions, notifications, automations, integrations, analytics |
| `bartsoj/notion-workspace` | `b18f2ed4ebacabe5e5671113d75667a70f9e196e` | shape-only | Cross-functional pages and typed databases with relations, templates, and multiple derived views | Notion compatibility, editor behavior, formulas, permissions, notifications, automations, AI, integrations |
| `bartsoj/attio-crm` | `e27bd7325d852bbb3d221db556052e8973176ed5` | shape-only | Relationship work where durable people/company/deal facts participate in process-specific lists | Attio import or sync, enrichment, communications, permissions, automations, integrations, analytics |
| `bartsoj/spec-kit-feature-specs` | `b3ffce8761fade4ac2cf6dca4e79ac0e8f29ed72` | native transport | The source already contains Spec Kit, or the user explicitly chooses a constitution plus feature packets | That Syns runs Spec Kit, inspects code, implements tasks, or should sync `.specify/feature.json` |
| `bartsoj/openspec-codebase-specs` | `386589ffba465d721124fce1205043ac222b0227` | native transport | The source already contains OpenSpec, or the user explicitly chooses current capability truth plus proposed deltas and archives | That Syns authors, applies, verifies, synchronizes, or archives OpenSpec changes |

## Selection

1. Detect native roots before considering shape-only references.
2. If one native root exists and the user wants to retain it, transport it without translation.
3. If both Spec Kit and OpenSpec exist, ask which one owns specification truth; this changes authority and is worth one content question.
4. For shape-only work, choose by the entities, relationships, lifecycle, and information questions evidenced in the source—not by name similarity.
5. Adopt at most one branded shape-only base. Add missing concerns as neutral modules rather than mixing product schemas.
6. It is valid for no reference to fit. Say so and compose a neutral structure.

Recognizability breaks a tie; it does not override information fit.

## Reading a reference

Local checkouts may be used when present:

- `/tmp/ticks-engineering-work-wiki`
- `/tmp/linear-engineering-work-wiki`
- `/tmp/notion-workspace-wiki`
- `/tmp/attio-crm-wiki`
- `/tmp/spec-kit-feature-wiki`
- `/tmp/openspec-codebase-wiki`

Otherwise pull a candidate at its pinned commit into the run's private temporary area. Read `README.md`, `STRUCTURE.md`, and `FIELD_MAP.md`/`FIELD-MAP.md` first. Read only the folders needed to understand candidate slots. Never silently substitute the remote head for the pinned commit.

## Composition rules

Each proposed path records one origin:

- `kept` — an existing file retained unchanged;
- `adopted` — a slot adapted from the selected shape-only reference;
- `native` — a parser-owned native artifact preserved in place;
- `neutral` — a general-purpose module added because evidence requires it;
- `source-required` — a new file whose need came directly from source evidence or a human answer;
- `generated` — navigation or a view derived from canonical files;
- `omitted` — an existing or candidate slot deliberately left out, with a reason.

A fact has one owner. Links and generated views may point to it; they do not restate it. Hierarchy points upward. Filterable/sortable state belongs in typed frontmatter for shape-only modules. Native artifacts keep the syntax their own tool parses.
