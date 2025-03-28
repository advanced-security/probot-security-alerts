import fs from 'fs';
import nock from 'nock';
import Stream from 'node:stream';
import path from 'path';
import {Probot, ProbotOctokit, Options, ApplicationFunction} from 'probot';
import {fileURLToPath} from 'url';
import {app as myProbotApp} from '../../src/index.js';
import {DEFAULT_APPROVING_TEAM} from '../../src/config/index.js';

const fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileName);

/**
 * Constants used in the fixtures
 */
export const IDENTIFIERS = {
  repositoryId: 100000001,
  repositoryName: '_myrepo',
  organizationId: 100000002,
  organizationName: '_orgname',
  userId: 100000003,
  userName: '_magicuser',
  appInstallationId: 10000004
} as const;

/**
 * The secret used for webhook signing
 */
export const WEBHOOK_SECRET = 'itsASecret';

/**
 * Gets the path to the fixtures
 * @param fixture the fixture to be loaded
 * @returns the path to the fixtures directory
 */
function getFixture(...fixture: string[]) {
  return path.join(__dirname, '..', 'fixtures', ...fixture);
}

/**
 * Gets the private key fixture
 * @returns the key string
 */
export function getPrivateKey() {
  const privateKey = fs.readFileSync(getFixture('mock-cert.pem'), 'utf-8');
  return privateKey;
}

/**
 * The supported alert types
 */
export type AlertType = 'dependabot' | 'code-scanning' | 'secret-scanning';

export class ReviewableStream extends Stream.Writable {
  private readonly _output: string[] = [];

  constructor() {
    super({objectMode: true});
    this._write = (object, _encoding, done) => {
      this._output.push(JSON.parse(object));
      done();
    };
  }

  public get output(): string[] {
    return this._output;
  }
}

/**
 * Gets the default configuration options for the testable Probot instance
 * @returns The default testable instance options
 */
export function getDefaultProbotOptions(): Options {
  const options: Options = {
    appId: 123,
    privateKey: getPrivateKey(),
    secret: WEBHOOK_SECRET,
    // disable request throttling and retries for testing
    Octokit: ProbotOctokit.defaults({
      retry: {enabled: false},
      throttle: {enabled: false}
    }),
    logLevel: 'fatal'
  };
  return options;
}

/**
 * Initializes the Probot app for testing with network monitoring.
 * @returns the configured probot test fixture
 */
export function getTestableProbot(
  app: ApplicationFunction = myProbotApp,
  options?: Options | undefined
): Probot {
  nock.disableNetConnect();
  const probotOptions = options ?? getDefaultProbotOptions();
  const probot = new Probot(probotOptions);
  // Load our app into probot
  probot.load(app);
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
    this.nock = scope ?? nock('https://api.github.com');
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
    const mock = this.nock
      .post(`/app/installations/${IDENTIFIERS.appInstallationId}/access_tokens`)
      .reply(200, {
        token: 'test',
        permissions: {
          security_events: 'read'
        }
      });
    return new OctokitApiMock(mock);
  }

  /**
   * Creates a nock for ensuring a user is not part of any team
   * @param approvingTeamName the team name
   * @returns the composable scope
   */
  public isNotInApprovingTeam(approvingTeamName = DEFAULT_APPROVING_TEAM) {
    const mock = this.nock
      .get(
        `/orgs/${IDENTIFIERS.organizationName}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.userName}`
      )
      .reply(404);

    return new OctokitApiMock(mock);
  }

  /**
   * Creates a nock for an error retrieving the team membership
   * @param status the HTTP status response
   * @param approvingTeamName the approving team
   * @returns the composable scope
   */
  public errorRetrievingTeamMembership(
    status = 500,
    approvingTeamName = DEFAULT_APPROVING_TEAM
  ) {
    const mock = this.nock
      .get(
        `/orgs/${IDENTIFIERS.organizationName}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.userName}`
      )
      .reply(status);

    return new OctokitApiMock(mock);
  }

  /**
   * Creates a nock for ensuring a user is part of the configured team.
   * Requires an access token request.
   * @param role The role name (default: maintainer)
   * @param approvingTeamName the team name
   * @returns the composable scope
   */
  public isInApprovingTeam(
    role = 'maintainer',
    approvingTeamName = DEFAULT_APPROVING_TEAM
  ) {
    // Test that we correctly request a token
    const mock = this.nock
      // Test that the user team membership is requested
      .get(
        `/orgs/${IDENTIFIERS.organizationName}/teams/${approvingTeamName}/memberships/${IDENTIFIERS.userName}`
      )
      .reply(200, {
        role: role,
        state: 'active'
      });
    return new OctokitApiMock(mock);
  }

  /**
   * Verifies an attempt to update an alert state to a given value
   * @param alert the alert type
   * @param state the alert state
   * @param id the alert id (default: 1)
   */
  public withAlertState(alert: AlertType, state: string, id = 1) {
    const mock = this.nock
      // Use `any` to allow any body type to be received

      .patch(
        `/repos/${IDENTIFIERS.organizationName}/${IDENTIFIERS.repositoryName}/${alert}/alerts/${id}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (body: any) => {
          expect(body).toMatchObject({state: state});
          return true;
        }
      )
      .reply(200);
    return new OctokitApiMock(mock);
  }
}
