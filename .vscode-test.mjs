import path from "path";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
    version: "1.99.0",
    files: [
        "out/test/ManifestActivation.test.js",
        "out/test/PhpParser.test.js",
        "out/test/PhpDocTypeExtractor.test.js",
        "out/test/NamespaceRefactorerAbstract.test.js",
        "out/test/NamespaceRefactorIntegration.test.js",
    ],
    launchArgs: [path.resolve(".")],
});
