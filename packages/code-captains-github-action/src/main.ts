import * as path from "path";

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import { EvaluatePolicyResult, evaluateRepoPolicy, renderRepoPolicy } from "@upshift-dev/code-captains-core";
import winston from "winston";

const CHANGED_FILES_INPUT = "changed-files";
const CODE_CAPTAINS_PATTERN = "**/code-captains.yml";
const CODE_CAPTAINS_OUTPUT = "code-captains-result";

// TODO(thomas): Allow setting log level via action input
const logger = winston.createLogger({
    level: "debug",
    transports: [new winston.transports.Console()],
});

const parseChangedFiles = (changedFilesStr: string) => {
    const result = JSON.parse(changedFilesStr);

    // Validate that the JSON was an array of strings
    if (!Array.isArray(result) || !result.every((item) => typeof item === "string")) {
        throw new Error("Parsed result is not an array of strings");
    }

    return result;
};

const buildFileMarkdownLink = (filePath: string) => {
    /**
     * Returns a markdown link to the file on the target ref. Falls back to just returning the filePath.
     */
    const { serverUrl, repo } = github.context;
    const baseRef = process.env.GITHUB_BASE_REF;
    if (!baseRef) {
        return filePath;
    }

    const targetFileUrl = encodeURI(`${serverUrl}/${repo.owner}/${repo.repo}/blob/${baseRef}/${filePath}`);
    return `[${filePath}](${targetFileUrl})`;
};

const main = async () => {
    // Parse required input
    const changedFilesStr = core.getInput(CHANGED_FILES_INPUT, { required: true });
    const changedFiles = parseChangedFiles(changedFilesStr);
    logger.debug("Running on changed files", { changedFiles });

    // Get all the code-captains YAML files
    const codeCaptainsGlobber = await glob.create(CODE_CAPTAINS_PATTERN);
    const absCodeCaptainsFiles = await codeCaptainsGlobber.glob();
    const cwd = process.cwd();
    const relCodeCaptainsFiles = absCodeCaptainsFiles.map((absPath) => path.relative(cwd, absPath));
    logger.debug("Running with code captains files", { relCodeCaptainsFiles });

    // Compute the captains
    const repoPolicy = await renderRepoPolicy(relCodeCaptainsFiles);
    logger.debug("Rendered the following repo-wide policy", { repoPolicy });
    const codeCaptainsResult = await evaluateRepoPolicy(repoPolicy, changedFiles);
    logger.debug("Computed code captains", { codeCaptainsResult });

    // Set output as JSON
    const resultWithFileLinks: EvaluatePolicyResult = {
        metPolicies: codeCaptainsResult.metPolicies.map((policy) => ({
            ...policy,
            policyFilePath: buildFileMarkdownLink(policy.policyFilePath),
        })),
    };
    core.setOutput(CODE_CAPTAINS_OUTPUT, JSON.stringify(resultWithFileLinks));
};

main();
