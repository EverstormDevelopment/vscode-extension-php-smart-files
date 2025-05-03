import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

/**
 * Test suite for the PHP File Creator extension.
 * Contains all tests to verify the extension's functionality.
 */
suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");

    /**
     * Sample test to verify the test environment is working correctly.
     * Tests the basic functionality of array indexOf.
     */
    test("Sample test", () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});
