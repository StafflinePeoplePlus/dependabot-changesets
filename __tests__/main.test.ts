import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';
import { run } from '../src/main';
import { jest } from '@jest/globals';

// Mock the GitHub API and core module
jest.mock('@actions/github');
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('fs/promises');

describe('run', () => {
	const mockOctokit = {
		rest: {
			pulls: {
				get: jest.fn(),
				listCommits: jest.fn(),
			},
		},
	};

	let fsActual: typeof fs;

	beforeEach(() => {
		// Reset all mocks
		jest.resetAllMocks();

		fsActual = jest.requireActual('fs/promises');

		(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);

		(fs.readFile as jest.Mock).mockImplementation(() => Promise.resolve('mock file content'));

		(fs.writeFile as jest.Mock).mockImplementation(() => Promise.resolve());

		// Mock core.getInput for required inputs
		(core.getInput as jest.Mock).mockImplementation((name) => {
			switch (name) {
				case 'owner':
					return 'test-owner';
				case 'repo':
					return 'test-repo';
				case 'pr-number':
					return '123';
				case 'token':
					return 'test-token';
				default:
					return '';
			}
		});
	});

	it('extracts changelog for single package PR when include-changelog is true', async () => {
		// Mock PR response with changelog
		const mockPRBody = await fsActual.readFile(__dirname + '/single-pr-body.txt', 'utf-8');

		mockOctokit.rest.pulls.get.mockImplementation(() => Promise.resolve({
			data: {
				title: 'Bump nanoid from 3.3.6 to 3.3.8',
				body: mockPRBody,
			},
			status: 200
		}));

		// Mock include-changelog input as true
		(core.getInput as jest.Mock).mockImplementation((name) => {
			switch (name) {
				case 'include-changelog':
					return 'true';
				default:
					return '';
			}
		});

		await run();

		// Verify that writeFile was called with content containing changelog
		const writeFileCalls = (fs.writeFile as jest.Mock).mock.calls;
		const hasChangelog = writeFileCalls.some((call) => {
			const content = call[1] as string;
			return content.includes('<details>') &&
				content.includes('Changelog') && content.includes('Commits');
		});
		expect(hasChangelog).toBe(true);
	});

	it('extracts changelog for grouped-package PRs when include-changelog is true', async () => {
		// Mock PR response with changelog
		const mockPRBody = await fsActual.readFile(__dirname + '/grouped-pr-body-with-table.txt', 'utf-8');;

		mockOctokit.rest.pulls.get.mockImplementation(() => Promise.resolve({
			data: {
				title: 'Bump the cloudflare group',
				body: mockPRBody,
			},
			status: 200
		}));

		// Mock include-changelog input as true
		(core.getInput as jest.Mock).mockImplementation((name) => {
			switch (name) {
				case 'include-changelog':
					return 'true';
				default:
					return '';
			}
		});

		await run();

		// Verify that writeFile was called with content containing changelog
		const writeFileCalls = (fs.writeFile as jest.Mock).mock.calls;
		const hasChangelog = writeFileCalls.some((call) => {
			const content = call[1] as string;
			return content.includes('<details>') &&
				content.includes('Changelog') && content.includes('Commits');
		});
		expect(hasChangelog).toBe(true);
	});

	it('does not extract changelog when include-changelog is false', async () => {
		// Mock PR response with changelog
		const mockPRBody = await fsActual.readFile(__dirname + '/single-pr-body.txt', 'utf-8');

		mockOctokit.rest.pulls.get.mockImplementation(() => Promise.resolve({
			data: {
				title: 'Bump nanoid from 3.3.6 to 3.3.8',
				body: mockPRBody,
			},
			status: 200
		}));

		// Mock include-changelog input as false (default)
		(core.getInput as jest.Mock).mockImplementation((name) => {
			if (name === 'include-changelog') return 'false';
			return '';
		});

		await run();

		// Verify that writeFile was called with content not containing changelog
		const writeFileCalls = (fs.writeFile as jest.Mock).mock.calls;
		const hasChangelog = writeFileCalls.every((call) => {
			const content = call[1] as string;
			return content.includes('<details>') ||
				content.includes('Release notes');
		});
		expect(hasChangelog).toBe(false);
	});
});
