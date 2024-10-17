import * as path from "path";

import * as core from "@actions/core";
import * as glob from "@actions/glob";
import { evaluateRepoPolicy, renderRepoPolicy } from "@upshift-dev/code-captains-core";
import winston from "winston";

const CHANGED_FILES_INPUT = "changed-files";
const CHANGED_FILES_SEPARATOR = "|";
const CODE_CAPTAINS_PATTERN = "**/code-captains.yml";
const CODE_CAPTAINS_OUTPUT = "code-captains";
const MET_POLICY_FILES_OUTPUT = "met-policy-files";
const OUTPUT_SEPARATOR = "|";

// TODO(thomas): Allow setting log level via action input
const logger = winston.createLogger({
    level: "debug",
    transports: [new winston.transports.Console()],
});

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

    // Set outputs
    core.setOutput(CODE_CAPTAINS_OUTPUT, [...codeCaptains].sort().join(OUTPUT_SEPARATOR));
    core.setOutput(MET_POLICY_FILES_OUTPUT, [...metPolicyFilePaths].sort().join(OUTPUT_SEPARATOR));
};

main();
