import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "./utils/helpers";
import installation_repositories_event from "./fixtures/installation_repositories/added.json";
import installation_created_event from "./fixtures/installation/created.json";
import installation_new_permissions_accepted_event from "./fixtures/installation/new_permissions_accepted.json";

describe("When running the probot app", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let probot: any;

  beforeEach(() => {
    probot = getTestableProbot();
  });

  test("receives installation_repositories message without calling additional GitHub APIs", async () => {
    const mock = mockGitHubApiRequests().toNock();
    await probot.receive({ name: "installation_repositories", payload: installation_repositories_event.payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("receives installation created message without calling additional GitHub APIs", async () => {
    const mock = mockGitHubApiRequests().toNock();
    await probot.receive({ name: "installation", payload: installation_created_event.payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("receives installation new permissions message without calling additional GitHub APIs", async () => {
    const mock = mockGitHubApiRequests().toNock();
    await probot.receive({ name: "installation", payload: installation_new_permissions_accepted_event.payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    resetNetworkMonitoring();
  });
});
