import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "../utils/helpers.js";
import payload from "./../fixtures/code_scanning_alert/closed_by_user.json";
import * as config from "../../src/config/index.js";
import { Severity } from "../../src/config/types.js";

describe("When code scanning alerts are received", () => {
  // Use the any type to avoid issues with additional fields in the payload that Probot cannot recognize
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let probot: any;

  beforeEach(() => {
    probot = getTestableProbot();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each(["maintainer", "member"])(`ignores alerts closed by a %s in the approving team`, async (role: string) => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isInApprovingTeam(role)
      .toNock();

    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('opens alerts closed by non-member of the approving team', async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState("code-scanning", "open")
      .toNock();

    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('opens alerts that are above a threshold', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest.spyOn(config, 'getConfiguration').mockImplementation(() =>
      { 
        return {...originalConfig, ...{ codeScanningMinimumSeverity: Severity.LOW }};
      });
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState("code-scanning", "open")
      .toNock();

    // Payload is medium security
    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test('allows alerts that are below a threshold', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest.spyOn(config, 'getConfiguration')
      .mockReturnValueOnce(
        {...originalConfig, ...{ codeScanningMinimumSeverity: Severity.HIGH }}
      );
    const mock = mockGitHubApiRequests().toNock();

    // Payload is medium security
    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test('allows alerts when threshold is NONE', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest.spyOn(config, 'getConfiguration')
      .mockReturnValueOnce(
        {...originalConfig, ...{ codeScanningMinimumSeverity: Severity.NONE }}
      );
    const mock = mockGitHubApiRequests().toNock();

    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test("opens alerts if membership request returns a 500 error", async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .errorRetrievingTeamMembership(500)
      .withAlertState("code-scanning", "open")
      .toNock();

    await probot.receive({ name: "code_scanning_alert.closed_by_user", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    resetNetworkMonitoring();
  });
});
