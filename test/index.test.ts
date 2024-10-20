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

    afterEach(() => {
        resetNetworkMonitoring();
        jest.resetAllMocks();
        jest.resetModules();
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

    test("logs `code_scanning_alert` received", async () => {
        const mock = mockGitHubApiRequests().toNock();
        const infolog = jest.fn();
        probot.log.info = infolog;
        await probot.receive({ name: "code_scanning_alert", payload: { action: "test" } });
        expect(mock.pendingMocks()).toStrictEqual([]);
        expect(infolog.mock.calls[0][0]).toContain("code_scanning_alert");
        expect(infolog.mock.calls[0][0]).toContain("test");
    });

    test("receives `onError`", async () => {
        expect.hasAssertions();
        const mock = mockGitHubApiRequests().toNock();
        const errorlog = jest.fn().mockImplementation(() => {});
        probot.log.error = errorlog;
        probot.webhooks.on("push", () => { throw new Error('Invalid input (expected console output from test)'); });
        try{
            await probot.webhooks.receive({
                id: 0,
                name: "push",
                payload: {}
            });
        }
        catch(e) {
            expect(errorlog).toHaveBeenCalled();
        }

        expect(mock.pendingMocks()).toStrictEqual([]);
    });
});
