import * as assert from "assert";
import { IdentifierKindEnum } from "../service/namespace/enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../service/namespace/enum/NameResolutionEnum";
import { PhpAstTraverser } from "../service/namespace/parser/PhpAstTraverser";
import { PhpParser } from "../service/namespace/parser/PhpParser";

suite("PhpParser", () => {
    suite("getUseStatements()", () => {
        test("returns grouped imports with prefix and shared group location", () => {
            const code = `<?php

namespace App\\Test;

use App\\Shared\\{Foo, Bar as Baz};

class Demo {}
`;

            const statements = new PhpParser(code).getUseStatements();

            assert.strictEqual(statements.length, 2);
            assert.strictEqual(statements[0].name, "App\\Shared\\Foo");
            assert.strictEqual(statements[1].name, "App\\Shared\\Bar");
            assert.strictEqual(statements[1].alias, "Baz");
            assert.strictEqual(statements[0].groupPrefix, "App\\Shared");
            assert.ok(statements[0].grouped);
            assert.strictEqual(statements[0].groupLoc.start, statements[1].groupLoc.start);
            assert.strictEqual(statements[0].groupLoc.end, statements[1].groupLoc.end);
        });

        test("returns grouped function and const imports with the correct kinds", () => {
            const functionCode = `<?php

namespace App\\Test;

use function App\\Support\\{first_helper, second_helper};

class Demo {}
`;
            const constantCode = `<?php

namespace App\\Test;

use const App\\Support\\{FIRST_FLAG, SECOND_FLAG};

class Demo {}
`;

            const functionStatements = new PhpParser(functionCode).getUseStatements();
            const constantStatements = new PhpParser(constantCode).getUseStatements();

            assert.strictEqual(functionStatements[0].kind, IdentifierKindEnum.Function);
            assert.strictEqual(functionStatements[0].groupPrefix, "App\\Support");
            assert.strictEqual(constantStatements[0].kind, IdentifierKindEnum.Constant);
            assert.strictEqual(constantStatements[0].groupPrefix, "App\\Support");
        });
    });

    suite("PhpAstTraverser attributes", () => {
        test("collects attribute references with the correct resolution and source offsets", () => {
            const code = `<?php

namespace App\\Test;

use App\\Meta\\NamedAttribute;

#[NamedAttribute]
#[Nested\\QualifiedAttribute]
#[\\Vendor\\Package\\FullyQualifiedAttribute]
class Demo
{
    #[MethodAttribute]
    public function handle(
        #[ParameterAttribute]
        string $value,
    ): void {
    }
}
`;

            const references = new PhpAstTraverser(new PhpParser(code).getAST(), code).getNameReferences(false);

            const attributeNames = [
                "NamedAttribute",
                "Nested\\QualifiedAttribute",
                "\\Vendor\\Package\\FullyQualifiedAttribute",
                "MethodAttribute",
                "ParameterAttribute",
            ];
            const attributeReferences = references.filter((reference) => attributeNames.includes(reference.name));

            assert.deepStrictEqual(
                attributeReferences.map((reference) => ({
                    name: reference.name,
                    resolution: reference.resolution,
                    snippet: code.slice(reference.loc.start, reference.loc.end),
                })),
                [
                    {
                        name: "NamedAttribute",
                        resolution: NameResolutionEnum.Uqn,
                        snippet: "NamedAttribute",
                    },
                    {
                        name: "Nested\\QualifiedAttribute",
                        resolution: NameResolutionEnum.Qn,
                        snippet: "Nested\\QualifiedAttribute",
                    },
                    {
                        name: "\\Vendor\\Package\\FullyQualifiedAttribute",
                        resolution: NameResolutionEnum.Fqn,
                        snippet: "\\Vendor\\Package\\FullyQualifiedAttribute",
                    },
                    {
                        name: "MethodAttribute",
                        resolution: NameResolutionEnum.Uqn,
                        snippet: "MethodAttribute",
                    },
                    {
                        name: "ParameterAttribute",
                        resolution: NameResolutionEnum.Uqn,
                        snippet: "ParameterAttribute",
                    },
                ],
            );

            assert.ok(attributeReferences.every((reference) => reference.kind === IdentifierKindEnum.Oop));
        });
    });
});
