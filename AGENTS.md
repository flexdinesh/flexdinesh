# Agent Guide — flexdinesh/flexdinesh

This is a **GitHub profile README** repo for `flexdinesh`. The `README.md` at the root is rendered on the GitHub profile page.

## Repo Purpose

Turns `flexdinesh/flexdinesh` into a living GitHub profile README. It auto-updates two dynamic sections:

1. **Repo star counts** — pulled from the GitHub API for a hardcoded list of current and past projects.
2. **Latest blog posts** — pulled from the RSS feed at `https://dineshpandiyan.com/blog/feed.xml`.

## File Structure

| File                                  | Purpose                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                           | The profile README. Contains HTML comment markers (`<!-- SECTION:START -->` / `<!-- SECTION:END -->`) that the update script targets. |
| `scripts/update-readme.js`            | Zero-dependency Node.js script. Fetches live data and injects it between the markers in `README.md`.                                  |
| `.github/workflows/update-readme.yml` | GitHub Actions workflow. Runs daily at midnight UTC + on every push to `main` + manual dispatch.                                      |
| `prompt.md`                           | Original requirements from the user who set this up.                                                                                  |
| `AGENTS.md`                           | This file.                                                                                                                            |

## How the Update Script Works

`scripts/update-readme.js` does three things in sequence:

1. **Current Projects** — loops over 12 repos, calls `https://api.github.com/repos/flexdinesh/{repo}`, reads `stargazers_count`, `description`, and `html_url`, then builds markdown list items.
2. **Past Popular Projects** — same logic for 5 legacy repos.
3. **Latest Blog Posts** — fetches `https://dineshpandiyan.com/blog/feed.xml`, parses items with a simple regex (no XML parser dependency), and takes the first 6.

### Marker Replacement

The script uses string-based marker replacement:

```
<!-- CURRENT-PROJECTS:START -->
...old content...
<!-- CURRENT-PROJECTS:END -->
```

Everything between `START` and `END` is replaced with freshly generated markdown. If a marker is missing, the script throws and exits non-zero.

### Repo Listings Format

Repos with a description:

```
- **[repo-name](https://github.com/flexdinesh/repo-name)** ⭐ 123 — description
```

Repos without a description (show name + stars only):

```
- **[repo-name](https://github.com/flexdinesh/repo-name)** ⭐ 0
```

### Authentication

In CI, the script uses `GITHUB_TOKEN` (`Bearer` header) for authenticated GitHub API requests. Locally it falls back to unauthenticated requests — be mindful of the 60 req/hr rate limit if running repeatedly.

## GitHub Actions Workflow

`.github/workflows/update-readme.yml`:

- **Trigger:** `schedule: '0 0 * * *'` (daily UTC), `push` to `main`, and `workflow_dispatch`.
- **Runner:** `ubuntu-latest` with Node 20.
- **Commit:** If `README.md` changed after the script runs, the workflow commits with `[skip ci]` in the message to avoid infinite loops, then pushes back to `main`.
- **Permissions:** `contents: write` is required for the bot to push.

## Adding or Removing Repos

Edit `scripts/update-readme.js`:

- `CURRENT_REPOS` array — list of repo names under the _Current Projects_ section.
- `PAST_REPOS` array — list of repo names under the _Past Popular Projects_ section.

Re-run the script locally (`node scripts/update-readme.js`) and commit the result. The workflow will pick up the new lists on its next run.

## Changing the Blog Feed

If the blog platform changes, update `BLOG_FEED_URL` in `scripts/update-readme.js`. The regex parser assumes standard RSS 2.0 `<item>` tags with `<title>` and `<link>` children.

## Static Sections

The following sections in `README.md` are **not** touched by the script and are safe to edit directly:

- Header / intro block (including the placeholder two-liner)
- GitHub Activity graph (`https://ghchart.rshah.org/flexdinesh`)
- Connect / social links

## Important Notes

- **No npm dependencies.** The script uses only Node.js built-ins (`fs`, `path`, `fetch`). Do not add a `package.json` or external XML parser unless absolutely necessary.
- **Do not delete the HTML comment markers** in `README.md`. The script depends on them.
- The `ghchart.rshah.org` contribution graph is a third-party image service. If it breaks, replace the `<img>` with an alternative or remove it.
- The placeholder two-liner in the header (`*[Two-liner about what I do — to be filled later]*`) should be replaced by the user when ready.
