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
