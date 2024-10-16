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
    transports: [new winston.transports.Console()],
});

const main = async () => {
    // Parse required input
    const changedFilesStr = core.getInput(CHANGED_FILES_INPUT, { required: true });
    const changedFiles = changedFilesStr.split(CHANGED_FILES_SEPARATOR);
    logger.debug("Running on changed files", { changedFiles });

    // Get all the code-captains YAML files
    const codeCaptainsGlobber = await glob.create(CODE_CAPTAINS_PATTERN);
    const codeCaptainsFiles = await codeCaptainsGlobber.glob();
    logger.debug("Running with code captains files", { codeCaptainsFiles });

    // Compute the captains
    const repoPolicy = await renderRepoPolicy(codeCaptainsFiles);
    logger.debug("Rendered the following repo-wide policy", { repoPolicy });
    const { codeCaptains, metPolicyFilePaths } = await evaluateRepoPolicy(repoPolicy, changedFiles);

    // Set outputs
    core.setOutput(CODE_CAPTAINS_OUTPUT, [...codeCaptains].sort().join(OUTPUT_SEPARATOR));
    core.setOutput(MET_POLICY_FILES_OUTPUT, [...metPolicyFilePaths].sort().join(OUTPUT_SEPARATOR));
};

main();
