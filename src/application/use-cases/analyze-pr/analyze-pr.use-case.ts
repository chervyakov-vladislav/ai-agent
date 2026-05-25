// import { validateAndFormatReview } from '@modules/github/github.validators';
import { logger } from '@shared/infrastructure/logger';
import {
  CodeSearchPort,
  CodeSplitterSearchQueryPort,
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
  codeSplitter: CodeSplitterSearchQueryPort;
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
  codeSplitter,
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

        let searchQueries: string[] = [searchQuery];

        if (searchQuery.length > 3000) {
          searchQueries = await codeSplitter.splitSearchQuery({
            searchQuery,
            chunkSize: 2500,
            chunkOverlap: 250,
          });
        }

        const allParentIds = new Set<string>();
        const strategy = codeSearching.getStrategy({
          isNew: file.isNew,
          isRenamed: file.isRenamed,
          additions: file.stats.additions,
          extension: file.extension,
        });

        for (const queryChunk of searchQueries) {
          logger.info(`Processing query chunk (Length: ${queryChunk.length})`);

          const queryVector = await embeddings.generateQueryEmbedding(queryChunk);

          const parentIds = await vectorstore.findHybridSimilarNodeIds(
            collectionName,
            queryVector,
            searchQuery,
            strategy,
          );

          for (const id of parentIds) {
            allParentIds.add(id);
          }
        }

        if (allParentIds.size === 0) continue;

        const uniqueParentIds = Array.from(allParentIds);
        const points = await vectorstore.getPoints(collectionName, uniqueParentIds);
        const content = codeSearching.reconstructChunks(points);

        logger.info('diff content \n' + file.promptData);
        logger.info('vector content \n' + content.map((c) => c.content).join('\n\n')); // убрать дубли через reranking
      }
    }
  };
};
