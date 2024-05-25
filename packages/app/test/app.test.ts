import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "./utils/helpers.js";

import installation_repositories_event from "./fixtures/installation_repositories/added.json";

import installation_created_event from "./fixtures/installation/created.json";

import installation_new_permissions_accepted_event from "./fixtures/installation/new_permissions_accepted.json";

describe("When running the probot app", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let probot: any; // Must use any type to avoid strong requirements for mock

    beforeEach(() => {
        probot = getTestableProbot();
        jest.clearAllMocks();
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
        const errorlog = jest.spyOn(probot.log, 'error').mockImplementation((...args:unknown[]) => {
            expect(args[0]).toMatch(/Error: Invalid input/);
        });

        probot.webhooks.on("push", () => { throw new Error('Invalid input'); });
        probot.webhooks.receive({
                id: 0,
                name: "push",
                payload: {}
            }).catch(() => {
                expect(errorlog).toHaveBeenCalled();
        });

        expect(mock.pendingMocks()).toStrictEqual([]);
    });

    afterEach(() => {
        resetNetworkMonitoring();
    });
});
/*
interface Err {
    id: number,
    err: {
        type: string,
        message: string,
        stack: string,
        event: {
            id: number,
            name: string,
            payload: unknown
        }
    }
}*/
