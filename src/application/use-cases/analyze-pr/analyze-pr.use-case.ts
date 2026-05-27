// import { validateAndFormatReview } from '@modules/github/github.validators';
import { Logger, logger } from '@shared/infrastructure/logger';
import {
  CodeSearchPort,
  CodeSplitterSearchQueryPort,
  EmbeddingQueryPort,
  PullRequestSourcePort,
  SearchCodeStrategyPort,
} from './analyze-pr.ports';
import { DiffWithContext } from '@application/contracts/code-analysis.types';
import { PrReviewPipeline } from '@application/pipelines/pr-review/pr-review.contracts';

interface AnalyzePRDependencies {
  github: PullRequestSourcePort;
  vectorstore: CodeSearchPort;
  embeddings: EmbeddingQueryPort;
  codeSearching: SearchCodeStrategyPort;
  codeSplitter: CodeSplitterSearchQueryPort;
  prReviewPipeline: PrReviewPipeline;
  parallelLimit: number;
  logger: Logger;
}

interface AnalyzePullRequestInput {
  prUrl: string;
  collectionName: string;
  currentBranch: string;
  commitHash: string;
  repoUrl: string;
}

export const createAnalyzePullRequestUseCase = ({
  github,
  codeSearching,
  embeddings,
  vectorstore,
  codeSplitter,
  prReviewPipeline,
}: AnalyzePRDependencies) => {
  return async ({
    prUrl,
    collectionName,
    currentBranch,
    repoUrl,
    commitHash,
  }: AnalyzePullRequestInput) => {
    const diff = await github.getPullRequestDiff(prUrl);
    const diffsWithContext: DiffWithContext[] = [];

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
        const content = codeSearching.reconstructChunks(points); // убрать дубли через reranking

        diffsWithContext.push({
          diffData: file.promptData,
          relevantCode: content.map((c) => c.content).join('\n\n'),
        });
      }
    }

    const reviewResult = await prReviewPipeline(diffsWithContext);
    await github.createPullRequestReview(prUrl, reviewResult, commitHash);
  };
};
