import { z } from 'zod';

export const syncSchema = z.object({ repoUrl: z.url() });
