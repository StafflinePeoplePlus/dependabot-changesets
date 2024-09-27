import { readFile } from 'fs/promises';
import {
	extractChangesetUpdate,
	extractUpdateFromTitle,
	extractUpdates,
	generateChangeset,
	getChangesetName,
	isGroupedPR,
} from '../src/utils';
import { expect } from '@jest/globals';

describe('isGroupedPR', () => {
	it('returns true for grouped PR titles', async () => {
		expect(isGroupedPR('Bump the all group with 9 updates')).toBe(true);
		expect(isGroupedPR('Bump the asdfghjkl group with 25 updates')).toBe(true);
		expect(isGroupedPR('Bump the all group across 1 directory with 19 updates')).toBe(true);
		expect(isGroupedPR('chore(deps): bump the all group with 3 updates ')).toBe(true);
	});
	it('returns false for non grouped PR titles', async () => {
		expect(isGroupedPR('Some other PR update')).toBe(false);
		expect(isGroupedPR('Bump marked from 9.1.5 to 9.1.6')).toBe(false);
		expect(
			isGroupedPR('chore(deps-dev): bump @typescript-eslint/parser from 6.10.0 to 6.11.0'),
		).toBe(false);
	});
});

describe('extractUpdates', () => {
	it('extracts updates from the body with table', async () => {
		const body = await readFile(__dirname + '/grouped-pr-body-with-table.txt', 'utf-8');
		expect(extractUpdates(body)).toEqual([
			{ package: '@auth/sveltekit', from: '0.3.11', to: '0.3.12' },
			{ package: '@sveltejs/kit', from: '1.27.4', to: '1.27.6' },
			{ package: '@typescript-eslint/eslint-plugin', from: '6.10.0', to: '6.11.0' },
			{ package: '@typescript-eslint/parser', from: '6.10.0', to: '6.11.0' },
			{ package: 'marked-gfm-heading-id', from: '3.1.0', to: '3.1.1' },
			{ package: 'prettier', from: '3.0.3', to: '3.1.0' },
			{ package: 'prettier-plugin-svelte', from: '3.0.3', to: '3.1.0' },
			{ package: 'svelte-check', from: '3.5.2', to: '3.6.0' },
			{ package: 'sveltekit-superforms', from: '1.10.1', to: '1.10.2' },
		]);
	});

	it('extracts updates from the body without table', async () => {
		const body = await readFile(__dirname + '/grouped-pr-body-without-table.txt', 'utf-8');
		expect(extractUpdates(body)).toEqual([
			{ package: '@playwright/test', from: '1.39.0', to: '1.40.0' },
			{ package: 'svelte', from: '4.2.3', to: '4.2.4' },
			{ package: 'wrangler', from: '3.15.0', to: '3.16.0' },
		]);
	});
});

describe('getChangesetName', () => {
	it('returns a valid filename for the given package', async () => {
		expect(getChangesetName('prettier')).toBe('prettier.md');
		expect(getChangesetName('prettier-plugin-svelte')).toBe('prettier-plugin-svelte.md');
		expect(getChangesetName('@typescript-eslint/parser')).toBe('@typescript-eslint__parser.md');
	});
});

describe('extractChangesetUpdate', () => {
	it('extracts update from changeset', async () => {
		const body = await readFile(__dirname + '/example-changeset.txt', 'utf-8');
		expect(extractChangesetUpdate(body)).toEqual({
			package: '@typescript-eslint/parser',
			from: '6.10.0',
			to: '6.11.0',
		});
	});
});

describe(`extractUpdateFromTitle`, () => {
	it('extracts update from title', async () => {
		expect(extractChangesetUpdate('Bump @typescript-eslint/parser from 6.10.0 to 6.11.0')).toEqual({
			package: '@typescript-eslint/parser',
			from: '6.10.0',
			to: '6.11.0',
		});
	});
	it('extract update from conventional commit title', async () => {
		expect(
			extractUpdateFromTitle(
				'chore(deps-dev): bump @typescript-eslint/parser from 6.10.0 to 6.11.0',
			),
		).toEqual({
			package: '@typescript-eslint/parser',
			from: '6.10.0',
			to: '6.11.0',
		});
	});
});

describe('generateChangeset', () => {
	it('generates valid changeset', async () => {
		expect(
			generateChangeset('my-cool-package', 'patch', {
				package: '@typescript-eslint/parser',
				from: '6.10.0',
				to: '6.11.0',
			}),
		).toEqual(`---
"my-cool-package": patch
---

Bump @typescript-eslint/parser from 6.10.0 to 6.11.0
`);
	});
});
