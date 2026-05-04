import { githubProvider, githubDiffProvider } from '@shared/infrastructure/axios/github-client';
import { ChangedFile, GithubFileResponse, RepositoryMetadata } from './github.types';

export const getPullRequestDiff = async (prUrl: string): Promise<string> => {
  const { data } = await githubDiffProvider.get(prUrl);
  return data;
};

export const getChangedFiles = async (prUrl: string): Promise<ChangedFile[]> => {
  const { data: allFiles } = await githubProvider.get<GithubFileResponse[]>(`${prUrl}/files`);

  const IGNORED_EXTENSIONS = ['.png', '.jpg', '.lock', '.json', '.svg'];
  const IGNORED_FILES = ['package-lock.json'];

  const filteredFiles = allFiles.filter((file) => {
    const isIgnoredExt = IGNORED_EXTENSIONS.some((ext) => file.filename.endsWith(ext));
    const isIgnoredFile = IGNORED_FILES.includes(file.filename);
    return !isIgnoredExt && !isIgnoredFile;
  });

  return Promise.all(
    filteredFiles.map(async (file): Promise<ChangedFile> => {
      const { data: content } = await githubProvider.get<string>(file.contents_url, {
        headers: { Accept: 'application/vnd.github.v3.raw' },
      });

      return {
        filename: file.filename,
        status: file.status,
        content: String(content),
      };
    }),
  );

  /* 
  // если поломаю гитхаб через promise.all
  const results: ChangedFile[] = [];
  for (const file of filteredFiles) {
    const { data: content } = await githubProvider.get<string>(file.contents_url, {
      headers: { Accept: 'application/vnd.github.v3.raw' },
    });
    results.push({
      filename: file.filename,
      status: file.status,
      content: String(content),
    });
  }
  return results;
  */
};

export const getRepositoryInfo = async (repoUrl: string): Promise<RepositoryMetadata> => {
  const { data } = await githubProvider.get(repoUrl);

  return {
    fullName: data.full_name,
    description: data.description,
    topics: data.topics,
    language: data.language,
  };
};
