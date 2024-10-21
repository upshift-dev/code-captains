import * as path from "path";

import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils.js";
import * as glob from "@actions/glob";
import { EvaluatePolicyResult, evaluateRepoPolicy, renderRepoPolicy } from "@upshift-dev/code-captains-core";
import winston from "winston";

const CHANGED_FILES_INPUT = "changed-files";
const CODE_CAPTAINS_PATTERN = "**/code-captains.yml";
const CODE_CAPTAINS_OUTPUT = "code-captains-result";

type GithubClient = InstanceType<typeof GitHub>;

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

const getAllApprovers = async (
    githubClient: GithubClient,
    repo: { owner: string; repo: string },
    pullNumber: number,
) => {
    /** Get all usernames of approvers. Results are lowercased and not necessarily unique. */
    const reviews = await githubClient.paginate(githubClient.rest.pulls.listReviews, {
        owner: repo.owner,
        repo: repo.repo,
        pull_number: pullNumber,
    });
    return reviews.filter((review) => review.state === "APPROVED").map((review) => review.user!.login.toLowerCase());
};

const getTeamMembers = async (githubClient: GithubClient, org: string, teamSlug: string) => {
    const members = await githubClient.paginate(githubClient.rest.teams.listMembersInOrg, {
        org,
        team_slug: teamSlug,
    });
    return members.map((member) => member.login.toLowerCase());
};

const parseCaptains = (captains: string[]) => {
    /**
     * Parse into arrays of user captains and team captains, with @ and / characters removed and everything lowercased.
     */
    // TODO(thomas): Should validate these names more clearly beforehand, e.g. that they all start with @
    const userCaptains = captains
        .filter((captain) => !captain.includes("/"))
        .map((username) => username.replace("@", "").toLowerCase());
    const teamCaptains = captains
        .filter((captain) => captain.includes("/"))
        .map((teamStr) => {
            const slashIndex = teamStr.indexOf("/");
            return {
                org: teamStr.substring(1, slashIndex).toLowerCase(),
                teamSlug: teamStr.substring(slashIndex + 1).toLowerCase(),
            };
        });
    return { userCaptains, teamCaptains };
};

const didAnyCaptainApprove = async (githubClient: GithubClient, captains: string[], approvers: string[]) => {
    const { userCaptains, teamCaptains } = parseCaptains(captains);

    // NOTE(thomas): We check for user approvers first so we can avoid API calls for team membership if there's a match
    if (approvers.some((approver) => userCaptains.includes(approver))) {
        return true;
    }

    // Get all the team members for the listed teams
    const teamMembers = (
        await Promise.all(
            teamCaptains.map((teamCaptain) => getTeamMembers(githubClient, teamCaptain.org, teamCaptain.teamSlug)),
        )
    ).flat();

    return approvers.some((approver) => teamMembers.includes(approver));
};

const main = async () => {
    // Parse required input
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error("GITHUB_TOKEN was not set");
    }
    const pullPayload = github.context.payload.pull_request;
    if (pullPayload == null) {
        throw new Error("This action requires the PR payload");
    }
    const pullNumber = pullPayload.number;
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

    if (codeCaptainsResult.metPolicies.length > 0) {
        // Check if approvers satisfy the policies
        const githubClient = github.getOctokit(token);
        const approvers = await getAllApprovers(githubClient, github.context.repo, pullNumber);
        const processedResults = {
            metPolicies: Promise.all(
                codeCaptainsResult.metPolicies.map(async (policy) => ({
                    ...policy,
                    policyFilePath: buildFileMarkdownLink(policy.policyFilePath),
                    isPolicySatisfied: await didAnyCaptainApprove(githubClient, policy.captains, approvers),
                })),
            ),
        };

        core.setOutput(CODE_CAPTAINS_OUTPUT, JSON.stringify(processedResults));
    } else {
        const result: EvaluatePolicyResult = { metPolicies: [] };
        core.setOutput(CODE_CAPTAINS_OUTPUT, JSON.stringify(result));
    }
};

main();
