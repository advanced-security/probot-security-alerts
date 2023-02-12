import nock from "nock";
import { Probot, ProbotOctokit } from "probot";
import fs from "fs";
import path from "path";
import myProbotApp from "../../src";
import { approvingTeamName } from "../../src/events/approvingTeam";

/**
 * Constants used in the fixtures
 */
const IDENTIFIERS = {
    REPOSITORY_ID: 100000001,
    REPOSITORY_NAME: "_myrepo",
    ORGANIZATION_ID: 100000002,
    ORGANIZATION_NAME: "_orgname",
    USER_ID: 100000003,
    USER_NAME: "_magicuser",
    APP_INSTALLATION_ID: 10000004,
} as const

/**
 * Gets the path to the fixtures
 * @param fixture the fixture to be loaded
 * @returns the path to the fixtures directory
 */
function getFixture(...fixture: string[]) {
    return path.join(...[__dirname, "..", "fixtures", ...fixture]);
}

/**
 * Gets the private key fixture
 * @returns the key string
 */
function getPrivateKey() {
    const privateKey = fs.readFileSync(
        getFixture("mock-cert.pem"),
        "utf-8"
    );
    return privateKey;
}

/**
 * The supported alert types
 */
export type AlertType = "dependabot" | "code-scanning" | "secret-scanning";

/**
 * Initializes the Probot app for testing with network monitoring.
 * @returns the configured probot test fixture
 */
export function getTestableProbot() {
    nock.disableNetConnect();
    const probot = new Probot({
        appId: 123,
        privateKey: getPrivateKey(),
        // disable request throttling and retries for testing
        Octokit: ProbotOctokit.defaults({
            retry: { enabled: false },
            throttle: { enabled: false },
        }),
        logLevel: "warn"
    });
    // Load our app into probot
    probot.load(myProbotApp);
    return probot;
}

/**
 * Resets the network monitor state
 */
export function resetNetworkMonitoring() {
    nock.cleanAll();
    nock.enableNetConnect();
}

/**
 * Creates a fluent scope for mocking GitHub API calls using Nock.
 * @returns A nock for the GitHub API endpoint
 */
export function mockGitHubApiRequests() {
    return new OctokitApiMock();
}

/** 
 * Helper class for mocking API calls.
 */
class OctokitApiMock {
    private nock: nock.Scope;
    constructor(scope: nock.Scope | null = null) {
        this.nock = scope ?? nock("https://api.github.com");
    }

    /**
     * Gets the associated nock instance
     * @returns the associated nock
     */
    public toNock() {
        return this.nock;
    }

    /**
     * Mocks the ability to get an access token with permissions:
     *  security_events: read
     * @returns the composable scope
     */
    public canRetrieveAccessToken() {
        // Test that we correctly request a token
        var mock = this.nock
            .post(`/app/installations/${IDENTIFIERS.APP_INSTALLATION_ID}/access_tokens`)
            .reply(200, {
                token: "test",
                permissions: {
                    security_events: "read",
                },
            });
        return new OctokitApiMock(mock);
    }

    /**
     * Creates a nock for ensuring a user is not part of any team
     * @returns the composable scope
     */
    public isNotInApprovingTeam() {
        var mock = this.nock.get(`/orgs/${IDENTIFIERS.ORGANIZATION_NAME}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.USER_NAME}`)
            .reply(404);

        return new OctokitApiMock(mock);
    }

    /**
     * Creates a nock for an error retrieving the team membership
     * @param status the HTTP status response
     * @returns the composable scope
     */
    public errorRetrievingTeamMembership(status: number = 500) {
        var mock = this.nock.get(`/orgs/${IDENTIFIERS.ORGANIZATION_NAME}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.USER_NAME}`)
            .reply(status);

        return new OctokitApiMock(mock);
    }

    /**
     * Creates a nock for ensuring a user is part of the configured team.
     * Requires an access token request.
     * @param role The role name (default: maintainer)
     * @returns the composable scope
     */
    public isInApprovingTeam(role: string = "maintainer") {
        // Test that we correctly request a token
        var mock = this.nock
            // Test that the user team membership is requested
            .get(`/orgs/${IDENTIFIERS.ORGANIZATION_NAME}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.USER_NAME}`)
            .reply(200, {
                role: role,
                state: "active"
            });
        return new OctokitApiMock(mock);
    }

    /**
     * Verifies an attempt to update an alert state to a given value
     * @param alert the alert type
     * @param state the alert state
     * @param id the alert id (default: 1)
     */
    public withAlertState(alert: AlertType, state: string, id: number = 1) {
        var mock = this.nock
            .patch(`/repos/${IDENTIFIERS.ORGANIZATION_NAME}/${IDENTIFIERS.REPOSITORY_NAME}/${alert}/alerts/${id}`, (body: any) => {
                expect(body).toMatchObject({ state: state })
                return true;
            })
            .reply(200);
        return new OctokitApiMock(mock);
    }
}
