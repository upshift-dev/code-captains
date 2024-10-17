import * as path from "path";

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as glob from "@actions/glob";
import { evaluateRepoPolicy, renderRepoPolicy } from "@upshift-dev/code-captains-core";
import winston from "winston";

const CHANGED_FILES_INPUT = "changed-files";
const CHANGED_FILES_SEPARATOR = "\\|";
const CODE_CAPTAINS_PATTERN = "**/code-captains.yml";
const CODE_CAPTAINS_OUTPUT = "code-captains";
const MET_POLICY_FILES_OUTPUT = "met-policy-files";
const OUTPUT_SEPARATOR = "\n- ";

// TODO(thomas): Allow setting log level via action input
const logger = winston.createLogger({
    level: "debug",
    transports: [new winston.transports.Console()],
});

const buildFileMarkdownLink = (filePath: string) => {
    /**
     * Returns a markdown link to the file on the target ref. Falls back to just returning the filePath.
     */
    const { serverUrl, repo } = github.context;
    const baseRef = process.env.GITHUB_BASE_REF;
    if (!baseRef) {
        return filePath;
    }

    const targetFileUrl = encodeURI(`${serverUrl}/${repo.repo}/blob/${baseRef}/${filePath}`);
    return `[${filePath}](${targetFileUrl})`;
};

const main = async () => {
    // Parse required input
    const changedFilesStr = core.getInput(CHANGED_FILES_INPUT, { required: true });
    const changedFiles = changedFilesStr.split(CHANGED_FILES_SEPARATOR);
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
    const { codeCaptains, metPolicyFilePaths } = await evaluateRepoPolicy(repoPolicy, changedFiles);
    logger.debug("Computed code captains", { codeCaptains, metPolicyFilePaths });

    // Format and set outputs
    const formattedCodeCaptains =
        codeCaptains.size > 0
            ? OUTPUT_SEPARATOR +
              [...codeCaptains]
                  .sort()
                  .map((captain) => `\`${captain}\``)
                  .join(OUTPUT_SEPARATOR)
            : "";
    const formattedFilePaths =
        metPolicyFilePaths.size > 0
            ? OUTPUT_SEPARATOR +
              [...metPolicyFilePaths]
                  .sort()
                  .map((filePath) => buildFileMarkdownLink(filePath))
                  .join(OUTPUT_SEPARATOR)
            : "";
    core.setOutput(CODE_CAPTAINS_OUTPUT, formattedCodeCaptains);
    core.setOutput(MET_POLICY_FILES_OUTPUT, formattedFilePaths);
};

main();
