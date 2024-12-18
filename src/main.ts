import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import {
	PackageUpdate,
	extractChangesetUpdate,
	extractUpdateFromTitle,
	extractUpdates,
	extractChangelog,
	generateChangeset,
	getChangesetName,
	isGroupedPR,
} from './utils';
import { readFile, writeFile } from 'fs/promises';

const dependabotCommitter = {
	name: 'dependabot[bot]',
	email: '49699333+dependabot[bot]@users.noreply.github.com',
};
const commitMessage = 'add changeset for dependency updates';

/**
 * The main function for the action.
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const owner = core.getInput('owner', { required: true });
		const repo = core.getInput('repo', { required: true });
		const prNumber = core.getInput('pr-number', { required: true });
		const token = core.getInput('token', { required: true });
		const packageName = core.getInput('package-name', { required: false }) || repo;
		const updateType = core.getInput('update-type', { required: false }) ?? 'patch';
		const gitUser = core.getInput('git-user', { required: false }) ?? dependabotCommitter.name;
		const gitEmail = core.getInput('git-email', { required: false }) ?? dependabotCommitter.email;
		const includeChangelog = core.getInput('include-changelog', { required: false }) === 'true';

		const octokit = github.getOctokit(token);
		const pr = await octokit.rest.pulls.get({ owner, repo, pull_number: Number(prNumber) });

		if (pr.status !== 200) {
			core.debug(JSON.stringify(pr, null, 4));
			throw new Error('Error fetching PR');
		}
		core.debug(`Found PR: ${JSON.stringify(pr, null, 4)}`);

		let updates: PackageUpdate[] = [];
		if (isGroupedPR(pr.data.title)) {
			updates = extractUpdates(pr.data.body ?? '');
			if (updates.length === 0) {
				// PR body might have been too long, try to fetch the body from the commit
				const commits = await octokit.rest.pulls.listCommits({
					owner,
					repo,
					pull_number: Number(prNumber),
				});
				const dependabotCommit = commits.data.find(
					(commit) =>
						commit.commit.author?.email === dependabotCommitter.email &&
						commit.commit.message !== commitMessage,
				);
				if (dependabotCommit) {
					updates = extractUpdates(dependabotCommit.commit.message);
				}
			}
		} else {
			const update = extractUpdateFromTitle(pr.data.title);
			if (update) {
				updates = [update];
			}
		}

		// Extract changelog for each update if enabled
		if (includeChangelog) {
			for (const update of updates) {
				update.changelog = extractChangelog(pr.data.body ?? '', update.package);
			}
		}

		core.debug(`Found updates: ${JSON.stringify(updates, null, 4)}`);
		if (updates.length === 0) {
			core.info('no dependency updates found in PR');
			return;
		}

		let newUpdates = 0;
		for (const update of updates) {
			const changesetName = getChangesetName(update.package);
			const changesetPath = `.changeset/${changesetName}`;
			const existingChangeset = await readFile(changesetPath, 'utf-8').catch(() => undefined);
			if (existingChangeset) {
				const existingUpdate = extractChangesetUpdate(existingChangeset);
				if (existingUpdate) {
					update.from = existingUpdate.from;
				}
			}
			const newChangeset = generateChangeset(packageName, updateType, update);
			if (existingChangeset === newChangeset) {
				core.info(`⏭️ No changeset needed for ${update.package} (${update.from} -> ${update.to})`);
				continue;
			}
			await writeFile(changesetPath, newChangeset, 'utf-8');
			newUpdates++;
			core.info(`✅ Created changeset for ${update.package} (${update.from} -> ${update.to})`);
		}

		if (newUpdates === 0) {
			core.info('no new changesets created');
			return;
		}

		await exec('git', ['config', '--global', 'user.name', gitUser]);
		await exec('git', ['config', '--global', 'user.email', gitEmail]);
		await exec('git add .changeset/*');
		await exec('git', ['commit', '-m', commitMessage]);
		await exec('git push');
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}
