import { Project, Node } from 'ts-morph';
import { CodeSymbol, CodeSymbolKind } from '@application/contracts/code-analysis.types';

export const getJsSymbols = (filename: string, code: string): CodeSymbol[] => {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipLoadingLibFiles: true,
    compilerOptions: { allowJs: true },
  });
  const sourceFile = project.createSourceFile(filename, code, { overwrite: true });
  const symbols: CodeSymbol[] = [];

  const addSymbol = (node: Node, kind: CodeSymbolKind, customName?: string) => {
    let name: string | undefined;

    if (customName) {
      name = customName;
    } else {
      // Node.isNameable(node) - слишком строгий для этой задачи и отбрасывает названия функций, интерфейсов, типов и.т.д.
      if ('getName' in node && typeof node.getName === 'function') {
        name = node.getName();
      }

      if (!name && Node.isExportGetable(node) && node.isDefaultExport()) {
        name = 'default';
      }
    }

    if (name) {
      const isDuplicate = symbols.some(
        (s) => s.name === name && s.startLine === node.getStartLineNumber(),
      );

      if (!isDuplicate) {
        symbols.push({
          name,
          kind,
          startLine: node.getStartLineNumber(),
          endLine: node.getEndLineNumber(),
        });
      }
    }
  };

  sourceFile.getClasses().forEach((c) => addSymbol(c, CodeSymbolKind.Class));
  sourceFile.getFunctions().forEach((f) => addSymbol(f, CodeSymbolKind.Function));
  sourceFile.getInterfaces().forEach((i) => addSymbol(i, CodeSymbolKind.Interface));
  sourceFile.getTypeAliases().forEach((t) => addSymbol(t, CodeSymbolKind.Type));
  sourceFile.getEnums().forEach((e) => addSymbol(e, CodeSymbolKind.Enum));
  sourceFile.getClasses().forEach((cls) => {
    cls.getMethods().forEach((m) => addSymbol(m, CodeSymbolKind.Method));
  });

  const defaultExportSymbol = sourceFile.getDefaultExportSymbol();

  if (defaultExportSymbol) {
    const declaration = defaultExportSymbol.getDeclarations()[0];
    if (declaration) {
      let kind = CodeSymbolKind.Variable;

      if (Node.isExpressionStatement(declaration) || Node.isCallExpression(declaration)) {
        kind = CodeSymbolKind.ConstFunc;
      }

      addSymbol(declaration, kind, 'defaultConfig');
    }
  }

  /**
   * Извлекает значимые символы из объявлений переменных (const, let, var).
   * * ЛОГИКА ФИЛЬТРАЦИИ И КЛАССИФИКАЦИИ:
   * 1. Игнорируются все неэкспортируемые переменные (считаются деталями реализации).
   * 2. Классифицируются как `ConstFunc`:
   * - Стрелочные функции и функциональные выражения.
   * - Результаты вызова функций (например, фабрики UseCase: `createUseCase(...)`).
   * 3. Классифицируются как `Variable`:
   * - Объектные литералы (конфиги, маппинги).
   * - Любые другие сложные выражения, не являющиеся примитивами.
   * 4. ПОЛНОСТЬЮ ИГНОРИРУЮТСЯ (Мусор):
   * - Простые строки и числа (например, ID, лимиты, смещения).
   * * @note Чтобы увеличить точность (полноту) индексации:
   * - Удалите `if (!isExported) return`, чтобы индексировать внутренние переменные файла.
   * - Удалите проверку `Node.isStringLiteral` / `isNumericLiteral`, если важно находить константные значения через поиск.
   */
  sourceFile.getVariableDeclarations().forEach((v) => {
    const initializer = v.getInitializer();
    if (!initializer) return;

    const name = v.getName();
    const parentStatement = v.getVariableStatement();
    const isExported =
      parentStatement?.isExported() || sourceFile.getExportedDeclarations().has(name);

    if (!isExported) return;

    const isFunction = Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer);
    const isFunctionalAction =
      Node.isCallExpression(initializer) || Node.isNewExpression(initializer);

    if (isFunction || isFunctionalAction) {
      return addSymbol(v, CodeSymbolKind.ConstFunc);
    }

    const isObject = Node.isObjectLiteralExpression(initializer);
    if (isObject) {
      return addSymbol(v, CodeSymbolKind.Variable);
    }

    if (Node.isStringLiteral(initializer) || Node.isNumericLiteral(initializer)) {
      return;
    }

    addSymbol(v, CodeSymbolKind.Variable);
  });

  return symbols;
};
