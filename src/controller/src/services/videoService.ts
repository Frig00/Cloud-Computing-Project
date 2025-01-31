import { timeStamp } from "console";
import prisma from "../data/prisma";
import { v4 as uuidv4 } from "uuid";
import { subscribe } from "diagnostics_channel";
import { videos_status } from "@prisma/client";

export class VideoService {
  /**
   * Get all public videos with pagination
   * @param skip - Number of videos to skip
   * @param take - Number of videos to take
   */
  static async getAllVideos(skip: number, take: number) {
    return await prisma.videos.findMany({
      where: { status: "PUBLIC" },
      orderBy: {
        uploadDate: "desc",
      },
      skip: skip,
      take: take
    });
  }

  /**
 * Get a video by its ID and check if the user has liked it
 * @param videoId - ID of the video
 * @param userId - ID of the user
 */
static async getVideoById(videoId: string, userId: string) {
  const video = await prisma.videos.findUnique({
    where: { id: videoId, status: "PUBLIC" },
    include: {
      likes: {
        where: {
          userId: userId,
        },
        take: 1,
      },
      video_moderation: { 
        select: {
          type: true
        }
      }
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
  const moderationTypes = video.video_moderation.map(m => m.type);

  return {
    ...video,
    totalLikes,
    userHasLiked,
    totalViews,
    moderationTypes,
  };
}
  /**
   * Retrieve all public videos by a specific user
   * @param userId - ID of the user
   */
  static async getVideosByUserId(userId: string) {
    try {
      const videos = await prisma.videos.findMany({
        where: {
          userId: userId,
          status: "PUBLIC",
        },
        orderBy: {
          uploadDate: "desc",
        },
      });

      return videos;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database query failed");
    }
  }

  /**
   * Search for public videos by title keywords
   * @param words - Array of keywords to search for
   */
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

  /**
   * Add or remove like from a video and return the updated number of likes
   * @param videoId - ID of the video
   * @param userId - ID of the user
   * @param isLiking - Boolean indicating if the user is liking or unliking the video
   */
  static async likeVideo(videoId: string, userId: string, isLiking: boolean) {
    try {
      if (isLiking) {
        await prisma.likes.upsert({
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
        await prisma.likes.delete({
          where: {
            videoId_userId: {
              videoId,
              userId,
            },
          },
        }).catch(() => null); // Return null if like doesn't exist
      }

      const updatedLikesCount = await prisma.likes.count({
        where: {
          videoId,
        },
      });

      return updatedLikesCount;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database query failed");
    }
  }

  /**
   * Add a comment to a video
   * @param videoId - ID of the video
   * @param userId - ID of the user
   * @param content - Content of the comment
   */
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

  /**
   * Get paginated comments for a video
   * @param videoId - ID of the video
   * @param skip - Number of comments to skip
   * @param take - Number of comments to take
   */
  static async getComments(videoId: string, skip: number, take: number) {
    try {
      const video = await prisma.videos.findUnique({
        where: { id: videoId, status: "PUBLIC" },
        include: {
          comments: {
            orderBy: {
              date: "desc",
            },
            skip: skip,
            take: take,
            include: {
              users: {
                select: {
                  userId: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      });

      if (!video) return [];

      return video.comments.map((comment) => ({
        id: comment.id,
        user: {
          userId: comment.users.userId,
          profilePictureUrl: comment.users.profilePictureUrl,
        },
        text: comment.content,
        timeStamp: comment.date.toISOString(),
      }));
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database query failed");
    }
  }

  /**
   * Increment the view count for a video
   * @param videoId - ID of the video
   * @param userId - ID of the user
   */
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


  /**
   * Get videos from subscriptions with pagination
   * @param subscriberId - ID of the subscriber
   * @param skip - Number of videos to skip
   * @param take - Number of videos to take
   */
  static async getSubscriptionVideos(subscriberId: string, skip: number, take: number) {
    console.log("Subscriber ID:", subscriberId);
    return await prisma.videos.findMany({
      where: {
        status: "PUBLIC",
        users: {
          subscriptions_subscriptions_subscribedToIdTousers: {
            some: {
              subscriberId
            }
          }
        }
      },
      orderBy: {
        uploadDate: "desc",
      },
      skip: skip,
      take: take
    });
  }

  /**
   * Delete a video and all its related data (comments, likes, views)
   * @param videoId - ID of the video to delete
   */
  static async deleteVideo(videoId: string, userId: string) {
    try {
      const video = await prisma.videos.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== userId) {
        throw new Error("Not authorized to delete this video");
      }


      return await prisma.$transaction(async (tx) => {
        // Delete all related comments
        await tx.comments.deleteMany({
          where: { videoId }
        });

        // Delete all related likes
        await tx.likes.deleteMany({
          where: { videoId }
        });

        // Delete all related views
        await tx.views.deleteMany({
          where: { videoId }
        });

        // Delete the video itself
        const deletedVideo = await tx.videos.delete({
          where: { id: videoId }
        });

        return deletedVideo;
      });
    } catch (error) {
      console.error("Failed to delete video:", error);
      throw new Error("Failed to delete video and its related data");
    }
  }
}
