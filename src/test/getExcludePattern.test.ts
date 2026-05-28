import * as assert from "assert";
import { getExcludePattern } from "../utils/filesystem/getExcludePattern";

suite("getExcludePattern", () => {
    test("returns undefined when no patterns are provided", () => {
        assert.strictEqual(getExcludePattern([]), undefined);
    });

    test("returns a single pattern without brace expansion", () => {
        assert.strictEqual(getExcludePattern(["src/Foo.php"]), "src/Foo.php");
    });

    test("returns a brace pattern for multiple patterns", () => {
        assert.strictEqual(getExcludePattern(["vendor/**", "src/Foo.php"]), "{vendor/**,src/Foo.php}");
    });
});
