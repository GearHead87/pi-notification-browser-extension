import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

function parseArgs(argv) {
	const args = {};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg.startsWith("--")) continue;

		const key = arg.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args[key] = "true";
			continue;
		}

		args[key] = next;
		index += 1;
	}

	return args;
}

const args = parseArgs(process.argv.slice(2));
const version = (args.version ?? process.env.RELEASE_VERSION ?? "").replace(/^v/, "");

if (!version) {
	throw new Error("Pass --version or set RELEASE_VERSION.");
}

const changelog = await readFile(changelogPath, "utf8");
const lines = changelog.split(/\r?\n/);
const headingIndex = lines.findIndex((line) => line.startsWith(`## [${version}]`));

if (headingIndex === -1) {
	throw new Error(`CHANGELOG.md does not contain release notes for ${version}`);
}

const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && line.startsWith("## ["));
const releaseNotes = lines
	.slice(headingIndex + 1, nextHeadingIndex === -1 ? undefined : nextHeadingIndex)
	.join("\n")
	.trim();

if (!releaseNotes) {
	throw new Error(`CHANGELOG.md release notes for ${version} are empty`);
}

if (args.output) {
	await writeFile(path.resolve(rootDir, args.output), `${releaseNotes}\n`);
} else {
	console.log(releaseNotes);
}
