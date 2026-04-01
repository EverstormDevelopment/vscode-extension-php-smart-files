import * as assert from "assert";
import * as path from "path";

const packageJson = require(path.resolve(__dirname, "../../package.json")) as {
    activationEvents?: string[];
    contributes?: {
        commands?: Array<{ command: string }>;
        menus?: {
            "explorer/context"?: Array<{ submenu?: string; command?: string }>;
        };
        submenus?: Array<{ id: string }>;
    };
};

suite("Extension Manifest Activation", () => {
    test("uses workspace and language activation without global startup activation", () => {
        const activationEvents = packageJson.activationEvents ?? [];

        assert.ok(activationEvents.includes("onLanguage:php"));
        assert.ok(activationEvents.includes("workspaceContains:**/*.php"));
        assert.ok(!activationEvents.includes("onStartupFinished"));
    });

    test("contributes commands so VS Code can activate the extension on command execution", () => {
        const commands = packageJson.contributes?.commands ?? [];

        assert.ok(commands.length > 0);
        assert.ok(commands.every((command) => command.command.startsWith("php-smart-files.")));
    });

    test("keeps the explorer submenu contribution available independently of activation", () => {
        const explorerMenu = packageJson.contributes?.menus?.["explorer/context"] ?? [];
        const submenus = packageJson.contributes?.submenus ?? [];

        assert.ok(explorerMenu.some((item) => item.submenu === "php-smart-files.submenu"));
        assert.ok(submenus.some((submenu) => submenu.id === "php-smart-files.submenu"));
    });
});
