import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPackagePath = path.join(rootDir, "extension", "package.json");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

const releaseTypes = new Set(["major", "minor", "patch"]);
const chromeVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

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

function nextVersion(currentVersion, requestedVersion) {
	const normalized = requestedVersion.replace(/^v/, "");

	if (releaseTypes.has(normalized)) {
		const match = currentVersion.match(chromeVersionPattern);
		if (!match) {
			throw new Error(`Current extension version must be x.y.z, got ${currentVersion}`);
		}

		const [major, minor, patch] = match.slice(1).map(Number);
		if (normalized === "major") return `${major + 1}.0.0`;
		if (normalized === "minor") return `${major}.${minor + 1}.0`;
		return `${major}.${minor}.${patch + 1}`;
	}

	if (!chromeVersionPattern.test(normalized)) {
		throw new Error(
			`Release version must be major, minor, patch, or a Chrome-compatible x.y.z version. Got ${requestedVersion}`,
		);
	}

	return normalized;
}

function compareVersions(left, right) {
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);

	for (let index = 0; index < 3; index += 1) {
		if (leftParts[index] > rightParts[index]) return 1;
		if (leftParts[index] < rightParts[index]) return -1;
	}

	return 0;
}

function formatReleaseNotes(notes) {
	const lines = notes
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => `- ${line.replace(/^[-*]\s+/, "")}`);

	if (lines.length === 0) {
		throw new Error("Release notes are required so the changelog can describe the release.");
	}

	return `${lines.join("\n")}\n`;
}

function updateChangelog(existingChangelog, version, formattedNotes) {
	const today = new Date().toISOString().slice(0, 10);
	const releaseHeading = `## [${version}] - ${today}`;
	const releaseBlock = `${releaseHeading}\n${formattedNotes}`;

	if (existingChangelog.includes(`## [${version}]`)) {
		throw new Error(`CHANGELOG.md already has an entry for ${version}`);
	}

	if (!existingChangelog.trim()) {
		return `# Changelog\n\nAll notable changes to the browser extension are documented in this file.\n\n## [Unreleased]\n\n${releaseBlock}`;
	}

	if (existingChangelog.includes("## [Unreleased]")) {
		return existingChangelog.replace("## [Unreleased]", `## [Unreleased]\n\n${releaseBlock}`);
	}

	return `${existingChangelog.trimEnd()}\n\n${releaseBlock}`;
}

async function readNotes(args) {
	if (args["notes-file"]) {
		return readFile(path.resolve(rootDir, args["notes-file"]), "utf8");
	}

	return args.notes ?? process.env.RELEASE_NOTES ?? "";
}

const args = parseArgs(process.argv.slice(2));
const requestedVersion = args.version ?? process.env.RELEASE_VERSION;

if (!requestedVersion) {
	throw new Error("Pass --version or set RELEASE_VERSION.");
}

const extensionPackage = JSON.parse(await readFile(extensionPackagePath, "utf8"));
const version = nextVersion(extensionPackage.version, requestedVersion);
if (compareVersions(version, extensionPackage.version) <= 0) {
	throw new Error(`Release version ${version} must be greater than current version ${extensionPackage.version}`);
}

const formattedNotes = formatReleaseNotes(await readNotes(args));

extensionPackage.version = version;
await writeFile(extensionPackagePath, `${JSON.stringify(extensionPackage, null, 2)}\n`);

let changelog = "";
try {
	changelog = await readFile(changelogPath, "utf8");
} catch (error) {
	if (error.code !== "ENOENT") throw error;
}

await writeFile(changelogPath, updateChangelog(changelog, version, formattedNotes));
console.log(version);
