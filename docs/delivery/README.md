# Delivery Matrix Exports

Generated artifacts:

- `shothik-delivery-matrix.xlsx`
- `shothik-delivery-matrix.csv`
- `shothik-delivery-summary.csv`

Regenerate with:

```bash
pnpm matrix:delivery
```

## Notes

- The workbook is grouped by service category and includes:
  - `Summary`
  - `Category Rollup`
  - `Delivery Matrix`
- The `.xlsx` workbook preserves:
  - hyperlinks
  - wrapped cell formatting
  - color-coded health indicators
- CSV exports preserve:
  - raw URLs
  - status labels
  - all text content required for spreadsheet import

## Source-of-truth caveats

The current repository does not publish a complete portfolio RACI or linked Jira
issue set. The delivery matrix therefore maps each workstream to the nearest
validated repository GitHub issue or pull request and assigns named owners from
the documented contributor directory in `docs/delivery/contributor-directory.md`.

Where dedicated workstream issues do not yet exist, the matrix records that
mapping explicitly instead of leaving placeholder tracker rows behind.

## Creating Dedicated GitHub Issues

Once the environment has a write-capable GitHub token, create the dedicated
tracker issues with:

```bash
pnpm delivery:issues:create
pnpm matrix:delivery
```

To preview the issue set without creating anything:

```bash
pnpm delivery:issues:plan
```

The issue seed source lives in `docs/delivery/dedicated-issue-seed.json`, and
successful issue creation writes `docs/delivery/issue-registry.json`. When that
registry exists, the matrix generator automatically prefers the dedicated issue
records over the fallback nearest-ticket mapping.
