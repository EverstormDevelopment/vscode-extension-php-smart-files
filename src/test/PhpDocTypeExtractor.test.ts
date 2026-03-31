import * as assert from "assert";
import { PhpDocTypeExtractor } from "../service/namespace/parser/PhpDocTypeExtractor";

suite("PhpDocTypeExtractor", () => {
    test("extracts importable identifiers from common PHPDoc tags", () => {
        const extractor = new PhpDocTypeExtractor(`<?php

/**
 * @param Collection<User>|Paginator<Result> $items
 * @return Response<Result>
 * @var Model[] $models
 * @throws DomainException
 * @property-read Metadata $metadata
 * @method Result run(Input $input, array<string, Filter> $filters = [])
 */
final class Example
{
}
`);

        const identifiers = extractor.getUnqualifiedOopReferences().map((identifier) => identifier.name);

        assert.deepStrictEqual(identifiers, [
            "Collection",
            "User",
            "Paginator",
            "Result",
            "Response",
            "Model",
            "DomainException",
            "Metadata",
            "Input",
            "Filter",
        ]);
    });

    test("ignores built-ins, pseudo-types, fully qualified names, and relative qualified names", () => {
        const extractor = new PhpDocTypeExtractor(`<?php

/**
 * @param class-string<User> $className
 * @return array<int, string>|null
 * @var \\App\\Shared\\Ready $ready
 * @property Sub\\RelativeThing $relativeThing
 * @method static callable(Input): void build(list<Filter> $filters)
 */
final class Example
{
}
`);

        const identifiers = extractor.getUnqualifiedOopReferences().map((identifier) => identifier.name);

        assert.deepStrictEqual(identifiers, [
            "User",
            "Input",
            "Filter",
        ]);
    });

    test("extracts identifiers from nullable intersections, array shapes, and nested generics", () => {
        const extractor = new PhpDocTypeExtractor(`<?php

/**
 * @param (User&Authenticatable)|null $user
 * @return array{
 *     actor: User,
 *     groups: list<Group>,
 *     paginator: Pager<Result>
 * }
 */
final class Example
{
}
`);

        const identifiers = extractor.getUnqualifiedOopReferences().map((identifier) => identifier.name);

        assert.deepStrictEqual(identifiers, [
            "User",
            "Authenticatable",
            "Group",
            "Pager",
            "Result",
        ]);
    });

    test("extracts identifiers from callable signatures and @method parameters with references", () => {
        const extractor = new PhpDocTypeExtractor(`<?php

/**
 * @param callable(Context, Payload=): HandlerResult $handler
 * @method static Collection build(Filter ...$filters, Input &$input)
 */
final class Example
{
}
`);

        const identifiers = extractor.getUnqualifiedOopReferences().map((identifier) => identifier.name);

        assert.deepStrictEqual(identifiers, [
            "Context",
            "Payload",
            "HandlerResult",
            "Collection",
            "Filter",
            "Input",
        ]);
    });
});
