import prisma from "../data/prisma";
import { v4 as uuidv4 } from "uuid";

export class VideoService {
  // Upload a video
  static async uploadVideo(title: string, user: string, videoUrl: string) {
    await prisma.videos.create({
      data: {
        id: uuidv4(),
        userId: user,
        title,
        uploadDate: new Date().getUTCSeconds(),
        videoRef: videoUrl,
      },
    });
  }

  // Get all videos
  static async getAllVideos() {
    return await prisma.videos.findMany({
      include: {
        comments: true,
        likes: true,
        views: true,
      },
    });
  }

  // Get a video by ID
  static async getVideoById(videoId: string) {
    return await prisma.videos.findUnique({
      where: { id: videoId },
      include: {
        comments: true,
        likes: true,
        views: true,
      },
    });
  }

  // Search for videos by title
  static async searchVideos(title: string) {
    return await prisma.videos.findMany({
      where: {
        title: {
          contains: title,
        },
      },
    });
  }

  // Like a video
  static async likeVideo(videoId: string, userId: string) {
    return await prisma.likes.create({
      data: {
        videoId,
        userId,
      },
    });
  }

  // Add a comment to a video
  static async addComment(videoId: string, userId: string, content: string) {
    return await prisma.comments.create({
      data: {
        id: uuidv4(),
        videoId,
        userId,
        content,
        date: new Date().getTime(),
      },
    });
  }
}
