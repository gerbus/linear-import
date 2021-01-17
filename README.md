# linear-import

Install the CLI:

```
yarn global add @linear/import
```

or

```
npm i -g @linear/import
```

Run interactive importer:

```
linear-import
```

## Importers

It's recommended to only import open issues to keep your Linear account more manageable.

### GitHub

Open GitHub issues can be imported with your personal access token from GitHub's API.

Supported fields:

- Title
- Description
- Labels
- (Optional) Comments

### Jira CSV

Jira project can be imported into a Linear team from the CSV export file.

The following fields are supported:

- `Summary` - Issue title
- `Description` - Converted into markdown and used as issue description
- `URL` - URL of Jira issue
- `Priority` - Issue priority
- `Issue key` - Used to build backlink to original Jira issue, and included as a `_jira_issue_key: {jirakey}` label. The label is useful in case you lose access to Jira before re-establishing ticket relationships in Linear.
- `Issue Type` - Added as a `Type: {jiratype}` label
- (Optional) `Release` - Added as a `_jira_release: {releasename}` label
- `Labels` - Added as `{Label}` labels
- `Assignee` - Added as a `_jira_assignee: {username}` label
- `Creator` - Added as a `_jira_creator: {username}` label
- `Created` - Added as a `_jira_created: {datetime}` label
- `Issue Id` (hidden) - Added as a `_jira_issue_id: {jiraid}` label _only for Sub-task type tickets_. The label is useful in case you lose access to Jira before re-establishing ticket relationships in Linear.
- `Parent Id` (hidden) - Added as a `_jira_parent_id: {jiraid}` label. The label is useful for re-establishing parent-child links in Linear.
- `Outward issue link (blocks)` - Added as a `_jira_blocks_key: {jirakey}` label
- `Outward issue link (relates)` - Added as a `_jira_related_key: {jirakey}` label
- `Outward issue link (duplicate)` - Added as a `_jira_dupe_key: {jirakey}` label
- `Watchers` - Added as a `_jira_watcher_key: {username}` label _only when different from both the ticket creator and assignee_

#### After Import

Filter All Issues in Linear by selecting all `_jira_assignee` labels. Go through the issues one-by-one and assign them, and remove the `_jira_assignee` label.

If you want to maintain some ticket relationships, you can walk through the issues in Linear one-by-one. For example, in Linear, you can filter All Issues by checking boxes for all labels including `_jira_parent_key` (better than filtering by `Type: Sub-task` because this will show children of Epics too). Once filtered, you can go through issue-by-issue and create links to parents (you might have to open the original Jira ticket to get the parent ticket name), and then remove the `_jira_parent_key` label.

### Asana CSV

Asana projects can be imported into a Linear team from the CSV export file.

Following fields are supported:

- `Name` - Issue title
- `Notes` - Converted into markdown and used as issue description
- `Priority` - Issue priority
- `Tags` - Added as a label
- `Assignee` - Issue assignee

### Pivotal Tracker CSV

Pivotal Tracker projects can be imported into a Linear team from the CSV export file. It only imports `chores`, `features`, and `bugs`.

Following fields are supported:

- `Title` - Issue title
- `Description` - Converted into markdown and used as issue description
- `Labels` - Added as a label
- `Owned By` - Story owner
- `URL` - URL of Pivotal Tracker story
- `Created at` - Preserves the story creation date

### Clubhouse CSV

Clubhouse workspaces can be imported into a Linear team from the CSV export file. It only imports `chores`, `features`, and `bugs`.

Following fields are supported:

- `Name` - Issue title
- `Description` - Clubhouse markdown formatted description
- `Tasks` - Appended to the description
- `External Tickets` - Appended to the description
- `State` - Mapped to the most similar Linear status
- `Type` - Added as a label
- `Tags` - Added as labels
- `Owners` - Story owner (only the first is preserved)
- `URL` - URL of Clubhouse story, also appended to the description
- `Created at` - Preserves the story creation date

### Trello JSON

Trello board can be imported into a Linear team from the JSON export file, which can be obtained by going into Board → Show Menu → More → Print and Export → Export as JSON.

Following fields are supported:

- `Name` - Issue title
- `Description` - Trello markdown formatted description
- `URL` - URL of Trello card
- `Labels` - Added as a label

## Todo

- [x] Automatic image uploads
- [ ] Assignees (pick from a list)
- [ ] Created at (requires API change)
