import prisma from "../data/prisma";
import {v4 as uuidv4} from 'uuid';

export class VideoService {
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
}
