---
name: github-pages-preview
description: Publish or replace this repository's self-contained review page through GitHub Pages without committing the preview or its lane marker.
---

# GitHub Pages preview

This repository publishes `GET /digest/2026-10-28` as the Pages site's `index.html` through
`.github/workflows/publish-preview.yml`. The exported HTML is generated during the workflow and
is not committed to the repository. The `LANE_MARKER` value must stay in an approved Actions
repository secret, never in source, workflow logs, issues, or chat.

## Publish or replace the page

1. Confirm the repository's Pages source is **GitHub Actions** and that the human approved the
   intended page and marker state.
2. Start a deployment:

   ```sh
   gh workflow run publish-preview.yml --repo czyzu1710/rig-morning-digest --ref main
   ```

3. Find and wait for the run:

   ```sh
   gh run list --repo czyzu1710/rig-morning-digest --workflow publish-preview.yml --limit 1
   gh run watch <run-id> --repo czyzu1710/rig-morning-digest --exit-status
   ```

4. Verify `https://czyzu1710.github.io/rig-morning-digest/` returns the expected self-contained
   digest HTML before sharing the link.

## Remove the lane marker after review

Only after the reviewer has finished and the human approves the replacement, delete the
`LANE_MARKER` repository secret, run the workflow again, and verify that the same URL says `no
marker set`. This replaces the current page; GitHub may retain old deployment artifacts or caches.
Do not claim that this erases every previous copy.

## Unpublish the Pages site

Only when the human asks to remove the entire site, disable Pages with the GitHub API:

```sh
gh api --method DELETE repos/czyzu1710/rig-morning-digest/pages
```

This takes down the whole site, not just the preview. Verify its state with a `GET` request to
`repos/czyzu1710/rig-morning-digest/pages`; a missing site is expected after deletion.
