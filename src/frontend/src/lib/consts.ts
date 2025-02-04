// export const API_BASE_PATH = import.meta.env.API_BASE_PATH || "http://localhost:3000";
// export const S3_BASE_PATH = import.meta.env.S3_BASE_PATH || "http://localhost:9000";
// export const GITHUB_LOGIN_URL = `${API_BASE_PATH}/auth/github`;

import { getApiUrl, getVideoUrl, getWebSocketUrl } from "@/services/configService";

export const masterPlaylistSrc = (videoId: string) => `${getVideoUrl()}/${videoId}/master.m3u8`;
export const thumbnailSrc = (videoId: string) => `${getVideoUrl()}/${videoId}/thumbnail.jpg`;
export const uploadSseEndpointUrl = (videoId: string) => `${getWebSocketUrl()}?videoId=${videoId}`;
export const uploadSseEndpointUrlSse = (videoId: string) => `${getApiUrl()}/upload/sse/${videoId}`;
