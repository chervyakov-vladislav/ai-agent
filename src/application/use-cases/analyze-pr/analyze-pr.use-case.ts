// import { validateAndFormatReview } from '@modules/github/github.validators';
import { logger } from '@shared/infrastructure/logger';
import {
  CodeSearchPort,
  EmbeddingQueryPort,
  LlmPort,
  PullRequestSourcePort,
  SearchCodeStrategyPort,
} from './analyze-pr.ports';

interface AnalyzePRDependencies {
  github: PullRequestSourcePort;
  llm: LlmPort;
  vectorstore: CodeSearchPort;
  embeddings: EmbeddingQueryPort;
  codeSearching: SearchCodeStrategyPort;
  parallelLimit: number;
}

interface AnalyzePullRequestInput {
  prUrl: string;
  collectionName: string;
  currentBranch: string;
  repoUrl: string;
}

export const createAnalyzePullRequestUseCase = ({
  github,
  codeSearching,
  embeddings,
  vectorstore,
  // llm,
}: AnalyzePRDependencies) => {
  return async ({ prUrl, collectionName, currentBranch, repoUrl }: AnalyzePullRequestInput) => {
    const diff = await github.getPullRequestDiff(prUrl);

    for (const file of diff) {
      const fullFileContent = await github.getFileContent({
        filePath: file.path,
        branch: currentBranch,
        repoUrl,
      });

      console.log(file.promptData);
      console.log(file.changedRanges);
      // console.log(JSON.stringify(file.promptData, null, 2));

      // continue;

      if (file.isDeleted) {
        // реализовать проверку через Graph Search для поиска неудаленных импортов. пока пропускаем
        continue;
      }

      // возможно не стоит склеивать
      const searchQuery = fullFileContent.content;

      if (searchQuery.length > 3000) {
        // идти в langchain и резать
      }

      if (!searchQuery) continue;

      const queryVector = await embeddings.generateQueryEmbedding(searchQuery);

      const strategy = codeSearching.getStrategy({
        isNew: file.isNew,
        isRenamed: file.isRenamed,
        additions: file.stats.additions,
        extension: file.extension,
      });

      const parentIds = await vectorstore.findHybridSimilarNodeIds(
        collectionName,
        queryVector,
        searchQuery,
        strategy,
      );
      const points = await vectorstore.getPoints(collectionName, parentIds);
      const content = codeSearching.reconstructChunks(points);

      logger.info('diff content \n' + file.promptData);
      logger.info('vector content \n' + content.map((c) => c.content).join('---\n')); // убрать дубли
    }
  };
};
