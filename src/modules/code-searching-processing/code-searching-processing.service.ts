import { DiffSearchStrategy } from '@application/contracts/code-analysis.types';

export const getSearchStrategy = (params: {
  isNew: boolean;
  isRenamed: boolean;
  extension: string;
  additions: number;
}): DiffSearchStrategy => {
  const { isNew, isRenamed, extension, additions } = params;

  let threshold = 0.75;
  let limit = 4;

  const isDataFile = ['json', 'yaml', 'yml', 'xml', 'md'].includes(extension);
  const isConfig = ['config', 'setup', 'env'].some((kw) => extension.includes(kw));

  if (isDataFile || isConfig) {
    threshold = 0.85;
    limit = 2;
  }

  if (isRenamed) {
    threshold = 0.8;
    limit = 2;
  } else if (isNew) {
    threshold = additions < 20 ? 0.8 : 0.75;
    limit = 3;
  }

  if (extension === 'css' || extension === 'scss') {
    threshold = 0.9;
    limit = 1;
  }

  return { threshold, limit };
};
