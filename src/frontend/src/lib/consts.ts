export const API_BASE_PATH =
  import.meta.env.API_BASE_PATH || "http://localhost:3000";
export const S3_BASE_PATH =
  import.meta.env.S3_BASE_PATH || "http://localhost:9000";

export const masterPlaylistSrc = (videoId: string) =>
  `${S3_BASE_PATH}/video-encoded/${videoId}/master.m3u8`;
export const thumbnailSrc = (videoId: string) =>
  `${S3_BASE_PATH}/video-encoded/${videoId}/thumbnail.jpg`;
export const uploadSseEndpointUrl = (videoId: string) =>
  `ws://localhost:3000/upload/ws/${videoId}`;
export const uploadSseEndpointUrlSse = (videoId: string) =>
  `${API_BASE_PATH}/upload/sse/${videoId}`;
