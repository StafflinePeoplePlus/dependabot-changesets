# Dependabot Changeset Github Action

GitHub action to generate changesets for your dependency updates made via dependabot PRs.

- Supports both normal dependabot PRs, as well as grouped PRs.
- Dedupes dependency updates between releases by updating the existing changeset

## Example workflow

This workflow will automatically run the action on PRs made with the `dependencies` label, the label
used by dependabot. It will find the updates made and then commit the changesets to the PR that
triggered the action.

```yml
name: Add changeset to Dependabot updates

on:
  pull_request_target:
    types: [opened, synchronize, labeled]

jobs:
  dependabot:
    name: Update Dependabot PR
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'dependencies')

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.ref }}
      - name: Update PR
        uses: StafflinePeoplePlus/dependabot-changesets@v0.1.0
        with:
          owner: MyGithubUser
          repo: my-cool-repo
          pr-number: ${{ github.event.pull_request.number }}
          token: ${{ secrets.CHANGESET_GITHUB_TOKEN }}
```

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `owner` | The owner of the repository | Yes | N/A |
| `repo` | The name of the repository | Yes | N/A |
| `pr-number` | The number of the PR to process | Yes | N/A |
| `token` | The GitHub token to use for API requests | Yes | N/A |
| `package-name` | The name of the package to use in the changeset | No | Same as `repo` |
| `update-type` | The type of update to use in the changeset | No | `patch` |
| `git-user` | The user to use for git commits | No | `dependabot[bot]` |
| `git-email` | The email to use for git commits | No | `49699333+dependabot[bot]@users.noreply.github.com` |
| `include-changelog` | Whether to include the changelog from Dependabot PRs in the generated changeset | No | `false` |
