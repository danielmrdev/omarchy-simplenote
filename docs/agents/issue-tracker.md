# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `danielmrdev/omarchy-simplenote`.
Use `gh` from this repository and confirm the target before creating issues.

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: explain in a comment, then run `gh issue close <number>`.

Use GitHub sub-issues and native issue dependencies where available; otherwise
record the parent and blockers in the issue body.

## Pull requests as a triage surface

PRs as a request surface: no.
