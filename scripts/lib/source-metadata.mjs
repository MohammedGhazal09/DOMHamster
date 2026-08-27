import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import ts from 'typescript';

function sourceFile(path) {
  return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
}

function variableInitializer(file, variableName) {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === variableName) {
        if (declaration.initializer === undefined) throw new Error(`DOMHAMSTER_METADATA_INITIALIZER_MISSING:${variableName}`);
        return declaration.initializer;
      }
    }
  }
  throw new Error(`DOMHAMSTER_METADATA_VARIABLE_MISSING:${variableName}`);
}
function unwrap(expression) {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) return unwrap(expression.expression);
  if (ts.isCallExpression(expression)) {
    const first = expression.arguments[0];
    if (first !== undefined) return unwrap(first);
  }
  return expression;
}
function property(object, name) {
  for (const item of object.properties) {
    if (!ts.isPropertyAssignment(item)) continue;
    const key = item.name;
    if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === name) return item.initializer;
  }
  throw new Error(`DOMHAMSTER_METADATA_PROPERTY_MISSING:${name}`);
}
function stringValue(expression, label) {
  const value = unwrap(expression);
  if (ts.isStringLiteralLike(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  throw new Error(`DOMHAMSTER_METADATA_STRING_REQUIRED:${label}`);
}
function booleanValue(expression, label) {
  const value = unwrap(expression);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  throw new Error(`DOMHAMSTER_METADATA_BOOLEAN_REQUIRED:${label}`);
}
function stringArray(expression, label) {
  const value = unwrap(expression);
  if (!ts.isArrayLiteralExpression(value)) throw new Error(`DOMHAMSTER_METADATA_ARRAY_REQUIRED:${label}`);
  return value.elements.map((element, index) => stringValue(element, `${label}[${index}]`));
}
export function readToolMetadata(root = process.cwd()) {
  const contractsFile = sourceFile(join(root, 'src/webmcp/contracts.ts'));
  const lifecycleFile = sourceFile(join(root, 'src/webmcp/lifecycle.ts'));
  const contractsExpression = unwrap(variableInitializer(contractsFile, 'RAW_TOOL_CONTRACTS'));
  if (!ts.isArrayLiteralExpression(contractsExpression)) throw new Error('DOMHAMSTER_CONTRACT_ARRAY_MISSING');
  const contracts = contractsExpression.elements.map((element, index) => {
    const object = unwrap(element);
    if (!ts.isObjectLiteralExpression(object)) throw new Error(`DOMHAMSTER_CONTRACT_OBJECT_REQUIRED:${index}`);
    const annotations = unwrap(property(object, 'annotations'));
    if (!ts.isObjectLiteralExpression(annotations)) throw new Error(`DOMHAMSTER_ANNOTATIONS_OBJECT_REQUIRED:${index}`);
    return Object.freeze({
      name: stringValue(property(object, 'name'), `contract[${index}].name`),
      title: stringValue(property(object, 'title'), `contract[${index}].title`),
      description: stringValue(property(object, 'description'), `contract[${index}].description`),
      readOnlyHint: booleanValue(property(annotations, 'readOnlyHint'), `contract[${index}].readOnlyHint`),
      untrustedContentHint: booleanValue(property(annotations, 'untrustedContentHint'), `contract[${index}].untrustedContentHint`),
    });
  });
  const lifecycleExpression = unwrap(variableInitializer(lifecycleFile, 'TOOL_NAMES_BY_STATE'));
  if (!ts.isObjectLiteralExpression(lifecycleExpression)) throw new Error('DOMHAMSTER_LIFECYCLE_OBJECT_MISSING');
  const lifecycle = {};
  for (const item of lifecycleExpression.properties) {
    if (!ts.isPropertyAssignment(item)) continue;
    const key = item.name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
    lifecycle[key.text] = Object.freeze(stringArray(item.initializer, `lifecycle.${key.text}`));
  }
  return Object.freeze({ contracts: Object.freeze(contracts), lifecycle: Object.freeze(lifecycle) });
}
export function sha256File(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
export function gitCommit(root = process.cwd()) {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
  catch { return process.env.DOMHAMSTER_COMMIT ?? 'unknown'; }
}
export const FROZEN_FIXTURE_HASH = 'b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1';
