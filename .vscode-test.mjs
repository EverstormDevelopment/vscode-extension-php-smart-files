import path from "path";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
    files: "out/test/extension.test.js",
    launchArgs: [path.resolve(".")],
});
