import { validateAndFormatReview } from '@modules/github/github.validators';
import {
  CodeSearchPort,
  EmbeddingQueryPort,
  LlmPort,
  PullRequestSourcePort,
  SearchCodeStrategyPort,
} from './analyze-pr.ports';

export interface AnalyzePRDependencies {
  github: PullRequestSourcePort;
  llm: LlmPort;
  vectorstore: CodeSearchPort;
  embeddings: EmbeddingQueryPort;
  codeSearching: SearchCodeStrategyPort;
  parallelLimit: number;
}

export const createAnalyzePullRequestUseCase = ({
  github,
  codeSearching,
  embeddings,
  vectorstore,
  llm,
}: AnalyzePRDependencies) => {
  return async (prUrl: string, collectionName: string) => {
    const diff = await github.getPullRequestDiff(prUrl);

    for (const file of diff) {
      if (file.isDeleted) {
        // реализовать проверку через Graph Search для поиска неудаленных импортов. пока пропускаем
        continue;
      }

      const searchQuery = file.chunks
        .map((c) => c.vectorQuery)
        .filter((q) => q.length > 10)
        .join('\n---\n');

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

      const parentIds = await vectorstore.findSimilarNodeIds(collectionName, queryVector, strategy);
      const points = await vectorstore.getPoints(collectionName, parentIds);
      const content = codeSearching.reconstructChunks(points);

      console.log(file.promptData);
      console.log(content); // убрать дубли
    }

    // const context = {
    //   project: {
    //     name: repoInfo.fullName,
    //     description: repoInfo.description,
    //     techStack: repoInfo.topics,
    //   },
    //   diff,
    //   files: files.map((f) => ({
    //     name: f.filename,
    //     action: f.status,
    //     body: f.content,
    //   })),
    // };

    // const result = await withRetry(() => llm.reviewCode(context));
    // const { summary, reviews } = validateAndFormatReview(result, diff);

    // await github.createPullRequestReview(prUrl, {
    //   verdict: 'COMMENT',
    //   summary,
    //   reviews,
    // });

    // return result;
  };
};
