import path from "path";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
    files: [
        "out/test/PhpParser.test.js",
        "out/test/PhpDocTypeExtractor.test.js",
        "out/test/NamespaceRefactorerAbstract.test.js",
        "out/test/NamespaceRefactorIntegration.test.js",
    ],
    launchArgs: [path.resolve(".")],
});
