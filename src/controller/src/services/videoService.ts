import { timeStamp } from "console";
import prisma from "../data/prisma";
import { v4 as uuidv4 } from "uuid";

export class VideoService {
  // Get all videos
  static async getAllVideos() {
    return await prisma.videos.findMany({
      where: { status: "PUBLIC" },
    });
  }

  // Get a video by ID
  static async getVideoById(videoId: string, userId: string) {
    // Fetch the video details, including relationships
    const video = await prisma.videos.findUnique({
      where: { id: videoId, status: "PUBLIC" },
      include: {
        likes: {
          where: {
            userId: userId,
          },
          take: 1,
        },
        comments: true,
      },
    });

    const videoCounts = await prisma.videos.findUnique({
      where: { id: videoId, status: "PUBLIC" },
      select: {
        _count: {
          select: {
            likes: true,
            views: true,
          },
        },
      },
    });

    if (!video || !videoCounts) return null;

    const totalLikes = videoCounts._count.likes;
    const userHasLiked = video.likes.length === 1;
    const totalViews = videoCounts._count.views;

    const comments = video.comments.map((comment) => ({
      id: comment.id,
      author: comment.userId,
      text: comment.content,
      timeStamp: comment.date.toISOString()
    }));

    return {
      ...video,
      totalLikes,
      userHasLiked,
      totalViews,
      comments,
    };
  }

  // Search for videos by title
  static async searchVideos(words: string[]) {
    if (words.length === 0) throw new Error("Empty search words"); // Guard against empty input

    const searchConditions = words.map((word) => ({
      title: {
        contains: word,
      },
    }));
    console.log("Search conditions:", searchConditions);

    try {
      return await prisma.videos.findMany({
        where: {
          OR: searchConditions,
          status: "PUBLIC",
        },
      });
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database query failed");
    }
  }

  // Add or remove like from a video
  static async likeVideo(videoId: string, userId: string, isLiking: boolean) {
    if (isLiking) {
      return await prisma.likes.upsert({
        where: {
          videoId_userId: {
            videoId,
            userId,
          },
        },
        create: {
          videoId,
          userId,
        },
        update: {},
      });
    } else {
      return await prisma.likes
        .delete({
          where: {
            videoId_userId: {
              videoId,
              userId,
            },
          },
        })
        .catch(() => null); // Return null if like doesn't exist
    }
  }

  // Add a comment to a video
  static async addComment(videoId: string, userId: string, content: string) {
    return await prisma.comments.create({
      data: {
        id: uuidv4(),
        videoId,
        userId,
        content,
        date: new Date(),
      },
    });
  }

  // Increment the view count for a video
  static async incrementViewCount(videoId: string, userId: string) {
    return await prisma.views.upsert({
      where: {
        videoId_userId: {
          videoId,
          userId,
        },
      },
      create: {
        videoId,
        userId,
      },
      update: {},
    });
  }
}
