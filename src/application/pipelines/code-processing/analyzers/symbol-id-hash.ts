import { createHash } from 'node:crypto';
import { BaseSymbol } from '@contracts/code-analysis.types';

export const makeSymbolId = (filePath: string, symbol: BaseSymbol) => {
  return createHash('sha1')
    .update(`${filePath}:${symbol.kind}:${symbol.name}:${symbol.startLine}`)
    .digest('hex');
};
