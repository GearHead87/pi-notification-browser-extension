import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function git(args) {
	return execFileSync("git", args, {
		cwd: rootDir,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function subjectToNote(subject) {
	const trimmed = subject.trim();
	if (!trimmed) return "";
	if (/^Merge\b/.test(trimmed)) return "";
	if (/^chore:\s+release extension v\d+\.\d+\.\d+$/i.test(trimmed)) return "";

	const conventionalMatch = trimmed.match(/^[a-z]+(?:\([^)]+\))?!?:\s+(.+)$/i);
	const note = conventionalMatch ? conventionalMatch[1] : trimmed;

	return note.charAt(0).toUpperCase() + note.slice(1);
}

const args = parseArgs(process.argv.slice(2));
const version = (args.version ?? process.env.RELEASE_VERSION ?? "").replace(/^v/, "");
const fromRef = args.from ?? process.env.RELEASE_NOTES_FROM ?? "";
const toRef = args.to ?? process.env.RELEASE_NOTES_TO ?? "HEAD";
const output = args.output ?? "";

if (!version) {
	throw new Error("Pass --version or set RELEASE_VERSION.");
}

const range = fromRef ? `${fromRef}..${toRef}` : toRef;
const subjects = git(["log", "--reverse", "--format=%s", range])
	.split(/\r?\n/)
	.map(subjectToNote)
	.filter(Boolean);

const releaseNotes = subjects.length > 0 ? subjects.join("\n") : `Release v${version}`;

if (output) {
	await writeFile(path.resolve(rootDir, output), `${releaseNotes}\n`);
} else {
	console.log(releaseNotes);
}
