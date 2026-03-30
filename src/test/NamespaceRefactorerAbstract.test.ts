import * as assert from "assert";
import { NamespaceRefactorerAbstract } from "../service/namespace/abstract/NamespaceRefactorerAbstract";
import { IdentifierKindEnum } from "../service/namespace/enum/IdentifierKindEnum";
import { NamespaceRegExpProvider } from "../service/namespace/provider/NamespaceRegExpProvider";
import { IdentifierType } from "../service/namespace/type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../service/namespace/type/NamespaceRefactorDetailsType";

class NamespaceRefactorerTestDouble extends NamespaceRefactorerAbstract {
    constructor() {
        super(new NamespaceRegExpProvider());
    }

    public async refactor(_refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        return false;
    }

    public removeImport(content: string, namespace: string, identifier: IdentifierType): string {
        return this.removeUseStatement(content, namespace, identifier);
    }

    public removeOwnNamespaceImports(content: string, namespace: string): string {
        return this.removeOwnNamespaceUseStatements(content, namespace);
    }

    public sortImports(content: string): string {
        return this.orderUseStatements(content);
    }
}

suite("NamespaceRefactorerAbstract", () => {
    test("removes a grouped import item and keeps the group when multiple imports remain", () => {
        const refactorer = new NamespaceRefactorerTestDouble();
        const content = `<?php

namespace App\\Consumer;

use App\\Shared\\{Foo, Bar, Baz};

class Demo {}
`;

        const updatedContent = refactorer.removeImport(content, "App\\Shared", {
            name: "Bar",
            kind: IdentifierKindEnum.Class,
        });

        assert.ok(updatedContent.includes("use App\\Shared\\{Foo, Baz};"));
        assert.ok(!updatedContent.includes("Bar"));
    });

    test("collapses a grouped import to a single use statement when one item remains", () => {
        const refactorer = new NamespaceRefactorerTestDouble();
        const content = `<?php

namespace App\\Consumer;

use App\\Shared\\{Foo, Bar};

class Demo {}
`;

        const updatedContent = refactorer.removeImport(content, "App\\Shared", {
            name: "Foo",
            kind: IdentifierKindEnum.Class,
        });

        assert.ok(!updatedContent.includes("use App\\Shared\\{"));
        assert.ok(updatedContent.includes("use App\\Shared\\Bar;"));
    });

    test("removes same-namespace items from a grouped import but preserves aliased imports", () => {
        const refactorer = new NamespaceRefactorerTestDouble();
        const content = `<?php

namespace App\\Domain;

use App\\Domain\\{User, UserCollection as Users};

class Demo {}
`;

        const updatedContent = refactorer.removeOwnNamespaceImports(content, "App\\Domain");

        assert.ok(!updatedContent.includes("User,"));
        assert.ok(updatedContent.includes("use App\\Domain\\UserCollection as Users;"));
    });

    test("sorts grouped and single imports without destroying the grouped statement", () => {
        const refactorer = new NamespaceRefactorerTestDouble();
        const content = `<?php

namespace App\\Consumer;

use function App\\Support\\zeta_helper;
use App\\Zoo;
use App\\Shared\\{Beta, Alpha};
use App\\Alpha;
use const App\\Support\\ZETA_FLAG;

class Demo {}
`;

        const updatedContent = refactorer.sortImports(content);

        const alphaIndex = updatedContent.indexOf("use App\\Alpha;");
        const groupIndex = updatedContent.indexOf("use App\\Shared\\{Beta, Alpha};");
        const zooIndex = updatedContent.indexOf("use App\\Zoo;");
        const functionIndex = updatedContent.indexOf("use function App\\Support\\zeta_helper;");
        const constIndex = updatedContent.indexOf("use const App\\Support\\ZETA_FLAG;");

        assert.ok(alphaIndex !== -1 && groupIndex !== -1 && zooIndex !== -1);
        assert.ok(alphaIndex < groupIndex);
        assert.ok(groupIndex < zooIndex);
        assert.ok(zooIndex < functionIndex);
        assert.ok(functionIndex < constIndex);
    });
});
