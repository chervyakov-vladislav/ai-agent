import * as githubService from '../github.service';

export const analyzePullRequestUseCase = async (prUrl: string, repoUrl: string) => {
  const [diff, files, repoInfo] = await Promise.all([
    githubService.getPullRequestDiff(prUrl),
    githubService.getChangedFiles(prUrl),
    githubService.getRepositoryInfo(repoUrl),
  ]);

  const context = {
    project: {
      name: repoInfo.fullName,
      description: repoInfo.description,
      techStack: repoInfo.topics,
    },
    diff,
    files: files.map((f) => ({
      name: f.filename,
      action: f.status,
      body: f.content,
    })),
  };

  return context;
};
