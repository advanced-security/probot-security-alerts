import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "./utils/helpers"
import event from "./fixtures/installation_repositories/added.json"

describe("When running the probot app", () => {
  let probot: any;

  beforeEach(() => {
    probot = getTestableProbot();
  });

  test("receives installation message without calling additional GitHub APIs", async () => {
    const mock = mockGitHubApiRequests().toNock();
    await probot.receive({ name: "installation", payload: event.payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    resetNetworkMonitoring();
  });
});
