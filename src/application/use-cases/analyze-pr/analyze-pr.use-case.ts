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

      if (file.isDeleted) {
        // реализовать проверку через Graph Search для поиска неудаленных импортов. пока пропускаем
        continue;
      }

      const changedBlocks = codeSearching.extractChangedCodeBlocks(
        file.path,
        fullFileContent.content,
        file.changedRanges,
      );

      if (changedBlocks.length === 0) continue;

      for (const block of changedBlocks) {
        if (block.code.trim().length < 20) {
          continue;
        }

        const searchQuery = block.searchQuery;

        if (!searchQuery.trim()) continue;

        if (searchQuery.length > 3000) {
          // идти в langchain и резать, если блок слишком большой
        }

        logger.info(file.promptData);
        logger.info(JSON.stringify({ searchQuery }, null, 2));
        continue;

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
    }
  };
};
