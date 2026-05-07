export interface QdrantStatusDTO {
  is_healthy: boolean;
  status_text: 'healthy' | 'unhealthy';
  service_name: string;
}

export interface AppStatusDTO {
  status: 'ok' | 'error';
  timestamp: string;
  node_version: string;
  app_version: string | undefined;
}

export interface RedisStatusDTO {
  is_healthy: boolean;
  status_text: string;
  service_name: string;
}

export interface HealthResponseDTO extends AppStatusDTO {
  services: {
    qdrant: QdrantStatusDTO;
    redis: RedisStatusDTO;
  };
}
