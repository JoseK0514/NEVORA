import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, it } from '@rstest/core';

// SY-012 / UI-6 (Nov 15, 2026): DESIGN.MD "Current direction" draws every Phosphor icon bold. An icon with no weight
// draws regular, and the `dist/ssr` icons used across the app do not read IconContext, so the weight has to be on the
// element (or on the one wrapper that renders it). This scan fails with the list of icons that would draw thin.
// "fill" stays allowed for filled and active states. "duotone" is allowed only in the files below.
const root = fileURLToPath(new URL("..", import.meta.url));

/** Folders that are not scanned, each with the reason. */
const skippedFolders: Record<string, string> = {
  "app/ui-preview": "fictional design previews, outside the SY-012 pass",
  "components/ui-preview": "components rendered only by the /ui-preview routes",
};

/** Files that keep an explicit duotone icon, each with the reason. */
const duotoneFiles: Record<string, string> = {
  "components/company-access/employee-invitation-panel.tsx": "22px panel heading mark, explicit before SY-012",
  "components/company-access/manager-operational-scope-panel.tsx": "22px panel heading mark, explicit before SY-012",
  "components/employee-time-panel.tsx": "20px section marks in My time, explicit before SY-012",
  "components/payroll/payroll-ui.tsx": "23px payroll document tile, explicit before SY-012",
};

/** Premium pass (Nov 21, 2026; Jose's pick 4): a glyph that stands inside a circle is duotone. The kit decides that in
 * one place per surface, so only these wrappers may compute a duotone weight. */
const markWrappers: Record<string, string> = {
  "components/clocker-icon.tsx": "ClockerIcon `mark`: rings, action circles and notes on the Clocker",
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    const key = relative(root, path);
    if (statSync(path).isDirectory()) return name === "test" || key in skippedFolders ? [] : sources(path);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

/** Local names that hold a Phosphor icon component: `const Icon = ...`, `const Glyph = map[tone]`, `event.Icon`. */
const indirectTag = /^(Icon|Glyph|[A-Za-z]+\.Icon)$/;

function offenders(file: string): string[] {
  const text = readFileSync(file, "utf8");
  if (!text.includes("@phosphor-icons/react") && !/<(Icon|Glyph|[A-Za-z]+\.Icon)[\s/>]/.test(text)) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imported = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.moduleSpecifier.text.startsWith("@phosphor-icons/react")) continue;
    const bindings = statement.importClause?.namedBindings;
    if (statement.importClause?.isTypeOnly || !bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) if (!element.isTypeOnly) imported.add(element.name.text);
  }
  const key = relative(root, file);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(source);
      if (imported.has(tag) || indirectTag.test(tag)) {
        const weight = node.attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "weight",
        );
        const value = weight?.initializer?.getText(source) ?? "";
        const problem = !weight ? "has no weight"
          : /regular|thin|light|undefined|null/.test(value) ? `can draw a weight other than bold or fill: ${value}`
          : /duotone/.test(value) && !(key in duotoneFiles) && !(key in markWrappers) ? "is duotone in a file that is not on the duotone list"
          : "";
        if (problem) found.push(`${key}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} <${tag}> ${problem}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

it("every Phosphor icon element sets its weight, and it is bold unless the state is filled", () => {
  expect(sources(root).flatMap(offenders)).toEqual([]);
});

it("the duotone list names only files that still draw a duotone icon", () => {
  const stale = Object.keys(duotoneFiles).filter(key => !/weight="duotone"/.test(readFileSync(join(root, key), "utf8")));
  expect(stale).toEqual([]);
});
