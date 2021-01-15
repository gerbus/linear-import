import { exit } from 'process';
import { Importer, ImportResult } from '../../types';
const fs = require('fs');
const csv = require('csvtojson');
const j2m = require('jira2md');

type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface JiraIssueType {
  Description: string;
  Status: string;
  'Issue key': string;
  'Issue Type': string;
  Priority: JiraPriority;
  'Project key': string;
  Summary: string;
  Assignee: string;
  Created: string;
  Release: string;
  'Custom field (Story Points)'?: string;
}

/**
 * Import issues from a Jira CSV export.
 *
 * @param apiKey GitHub api key for authentication
 */
export class JiraCsvImporter implements Importer {
  public constructor(filePath: string, orgSlug: string, customUrl: string) {
    this.filePath = filePath;
    this.organizationName = orgSlug;
    this.customJiraUrl = customUrl;
  }

  public get name() {
    return 'Jira (CSV)';
  }

  public get defaultTeamName() {
    return 'Jira';
  }

  public import = async (): Promise<ImportResult> => {
    const { dedupedFilePath, dedupedHeaderMap } = getDedupedHeaders(
      this.filePath
    );
    const data = (await csv().fromFile(dedupedFilePath)) as JiraIssueType[];

    const importData: ImportResult = {
      issues: [],
      labels: {},
      users: {},
      statuses: {},
    };

    const statuses = Array.from(new Set(data.map(row => row['Status'])));
    const assignees = Array.from(new Set(data.map(row => row['Assignee'])));

    for (const user of assignees) {
      importData.users[user] = {
        name: user,
      };
    }
    for (const status of statuses) {
      importData.statuses![status] = {
        name: status,
      };
    }

    for (const row of data) {
      const url = this.organizationName
        ? `https://${this.organizationName}.atlassian.net/browse/${row['Issue key']}`
        : `${this.customJiraUrl}/browse/${row['Issue key']}`;
      const mdDesc = row['Description']
        ? j2m.to_markdown(row['Description'])
        : undefined;
      const description =
        mdDesc && url
          ? `${mdDesc}\n\n[View original issue in Jira](${url})`
          : url
          ? `[View original issue in Jira](${url})`
          : undefined;
      const priority = mapPriority(row['Priority']);
      const type = `Type: ${row['Issue Type']}`;
      const assigneeId =
        row['Assignee'] && row['Assignee'].length > 0
          ? row['Assignee']
          : undefined;
      const status = row['Status'];

      // Convert to labels
      const labels = [type];
      const release = convertToLabel(row, 'Release');
      const creator = convertToLabel(row, 'Creator');
      const created = convertToLabel(row, 'Created');
      const assignee = convertToLabel(row, 'Assignee');
      const issuekey = convertToLabel(row, 'Issue key');
      const issueid = convertToLabel(row, 'Issue id');
      const parentid = convertToLabel(row, 'Parent id');
      if (release) labels.push(release);
      if (creator) labels.push(creator);
      if (created) labels.push(created);
      if (assignee) labels.push(assignee);
      if (issuekey) labels.push(issuekey);
      if (issueid) labels.push(issueid);
      if (parentid) labels.push(parentid);

      dedupedHeaderMap.forEach(map => {
        const key = map.deduped;
        const originalKey = map.original;

        switch (originalKey) {
          case 'Labels': {
            const l = getCell(row, key);
            if (l) labels.push(l);
            break;
          }
          case 'Outward issue link (Blocks)': {
            const block = convertToLabel(row, key, `_jira_blocks_key: `);
            if (block) labels.push(block);
            break;
          }
          case 'Outward issue link (Relates)': {
            const relation = convertToLabel(row, key, '_jira_related_key: ');
            if (relation) labels.push(relation);
            break;
          }
          case 'Outward issue link (Duplicate)': {
            const duplicate = convertToLabel(row, key, '_jira_dupe_key: ');
            if (duplicate) labels.push(duplicate);
            break;
          }
          case 'Watchers': {
            const watcher = convertToLabel(row, key, '_jira_watcher: ');
            if (watcher && getCell(row, key) !== getCell(row, 'Creator'))
              labels.push(watcher);
          }
        }
      });

      importData.issues.push({
        title: row['Summary'],
        description,
        status,
        priority,
        url,
        assigneeId,
        labels,
      });

      for (const lab of labels) {
        if (!importData.labels[lab]) {
          importData.labels[lab] = {
            name: lab,
          };
        }
      }
    }

    //console.log(JSON.stringify(importData,undefined,2))
    return importData;
  };

  // -- Private interface

  private filePath: string;
  private customJiraUrl: string;
  private organizationName?: string;
}

const mapPriority = (input: JiraPriority): number => {
  const priorityMap = {
    Highest: 1,
    High: 2,
    Medium: 3,
    Low: 4,
    Lowest: 0,
  };
  return priorityMap[input] || 0;
};

type dedupedHeadersType = {
  deduped: string;
  original: string;
};
type getDedupedHeadersType = {
  dedupedFilePath: string;
  dedupedHeaderMap: dedupedHeadersType[];
};
const getDedupedHeaders = (filePath: string): getDedupedHeadersType => {
  const lines: string[] = fs
    .readFileSync(filePath, { encoding: 'utf8' })
    .toString()
    .split('\n');
  const originalHeaders: string[] = lines[0].split(',');
  const processedHeaders: string[] = [];
  const dedupedHeaders: dedupedHeadersType[] = originalHeaders.map(header => {
    const isDupe =
      originalHeaders.filter(originalHeader => originalHeader === header)
        .length > 1;
    if (isDupe) {
      const index = processedHeaders.filter(
        processedHeader => processedHeader === header
      ).length;
      processedHeaders.push(header);
      return {
        deduped: `${header}_${index}`,
        original: header,
      };
    }
    return {
      deduped: header,
      original: header,
    };
  });

  let fd;
  const filePathParts = filePath.split('.');
  filePathParts.splice(1, 0, 'deduped');
  const dedupedFilePath = filePathParts.join('.');
  try {
    fd = fs.openSync(
      dedupedFilePath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_TRUNC |
        fs.constants.O_APPEND
    );
    fs.appendFileSync(
      fd,
      dedupedHeaders.map(obj => obj.deduped).join(',') + '\n'
    );
    for (let l = 1; l < lines.length; l++) {
      fs.appendFileSync(dedupedFilePath, lines[l] + '\n');
    }
  } catch (e) {
    console.error(e);
    exit;
  } finally {
    fs.closeSync(fd);
  }

  return {
    dedupedFilePath: dedupedFilePath,
    dedupedHeaderMap: dedupedHeaders,
  };
};

const convertToLabel = (row: any, colKey: string, overrideLabel?: string) => {
  const val = getCell(row, colKey);
  if (!val) return false;
  const outLabel =
    overrideLabel !== undefined
      ? overrideLabel
      : `_jira_${colKey
          .split(' ')
          .join('_')
          .toLowerCase()}: `;
  return `${outLabel}${val}`;
};

const getCell = (row: any, colKey: string) => {
  return row[colKey] && row[colKey].length > 0 ? row[colKey] : false;
};
