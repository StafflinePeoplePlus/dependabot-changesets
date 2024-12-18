const groupedPRRegex = /[Bb]ump the .+? group/;
export function isGroupedPR(title: string) {
	return groupedPRRegex.test(title);
}

export type PackageUpdate = { package: string; from: string; to: string; changelog?: string };
export function extractUpdates(body: string): PackageUpdate[] {
	// e.g. Updates `wrangler` from 3.15.0 to 3.16.0
	const updateRegex = /(?:\n|^)Updates `(.+?)` from (.+?) to (.+?)(?:\n|$)/g;
	const updates = [];
	let match: RegExpExecArray | null;
	while ((match = updateRegex.exec(body)) !== null) {
		updates.push({
			package: match[1],
			from: match[2],
			to: match[3],
		});
	}
	return updates;
}

export function extractUpdateFromTitle(title: string): PackageUpdate | undefined {
	// They end up being the same thing!
	return extractChangesetUpdate(title);
}

export function getChangesetName(pkg: string) {
	const name = pkg.replace(/\//g, '__');
	return `${name}.md`;
}

/**
 * Extract the update from an existing changeset
 */
export function extractChangesetUpdate(body: string): PackageUpdate | undefined {
	// e.g. `Bump @typescript-eslint/eslint-plugin from 6.9.1 to 6.10.0`
	//   or `chore(deps-dev): bump @typescript-eslint/eslint-plugin from 6.9.1 to 6.10.0`
	const updateRegex = /[Bb]ump (.+?) from (.+?) to (.+?)(?:\n|$)/;
	const match = updateRegex.exec(body);
	if (match === null) return undefined;
	return {
		package: match[1],
		from: match[2],
		to: match[3],
	};
}

/**
 * Extract the changelog from a PR body for a specific package
 */
export function extractChangelog(body: string, pkg: string): string | undefined {
	const groups = Array.from(body.matchAll(/\n?(.+)\n((?:<details>[\s\S]*?<\/details>\n?){2})/g));

	return groups.find((group) => group[1].includes(pkg))?.[2];
}

export function generateChangeset(packageName: string, updateType: string, update: PackageUpdate) {
	// e.g.
	// ---
	// "my-repo": patch
	// ---
	// Bump @typescript-eslint/parser from 6.10.0 to 6.11.0
	//
	return `---
${JSON.stringify(packageName)}: ${updateType}
---

Bump ${update.package} from ${update.from} to ${update.to}
${update.changelog ? `\n${update.changelog}` : ''}
`;
}
