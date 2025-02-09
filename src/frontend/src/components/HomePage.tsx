import { Button, Container, Typography } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoAllVideosGet200ResponseInner, VideoApi } from "../api";
import { thumbnailSrc } from "../lib/consts";
import { useEffect, useState } from "react";

const PAGE_SIZE = 100;

interface VideoListProps {
  videos: VideoAllVideosGet200ResponseInner[];
  onLoadMore: () => void;
  title?: string;
  isLoading?: boolean;
}

const useVideoFetch = (queryKey: string, fetchFn: (skip: number) => Promise<VideoAllVideosGet200ResponseInner[]>) => {
  const [skip, setSkip] = useState(0);
  const [videos, setVideos] = useState<VideoAllVideosGet200ResponseInner[]>([]);

  const { isPending, error, data } = useQuery({
    queryKey: [queryKey, skip, PAGE_SIZE],
    queryFn: () => fetchFn(skip)
  });

  useEffect(() => {
    // Reset videos when query key changes
    return () => {
      setVideos([]);
      setSkip(0);
    };
  }, [queryKey]);

  useEffect(() => {
    if (data) {
      setVideos(prev => skip === 0 ? data : [...prev, ...data]);
    }
  }, [data, skip]);

  return { videos, isLoading: isPending, error, loadMore: () => setSkip(skip + PAGE_SIZE) };
};

const VideoList = ({ videos, onLoadMore, title, isLoading }: VideoListProps) => (
  <>
    {title && (
      <Typography variant="h4" sx={{ marginTop: "1rem" }}>{title}</Typography>
    )}
    {videos.length === 0 ? (
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ margin: "1rem" }}
      >
        No videos available
      </Typography>
    ) : (
      <>
        <div className="flex gap-2 flex-wrap m-2">
          {videos?.map((video) => (
            <VideoThumbnail
              id={video.id}
              src={thumbnailSrc(video.id)}
              title={video.title}
              user={video.userId}
              key={video.id}
              variant="small"
            />
          ))}
        </div>
        <Button
          variant="outlined"
          color="primary"
          sx={{ marginTop: "0.5rem" }}
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </Button>
      </>
    )}
  </>
);

export default function HomePage() {
  const videoApi = new VideoApi();

  const {
    videos: subscribedVideos,
    isLoading: isLoadingSubscribed,
    error: errorSubscribed,
    loadMore: loadMoreSubscribed
  } = useVideoFetch(
    "videoSubscriptionsGet",
    (skip) => videoApi.videoSubscriptionsGet({ skip, take: PAGE_SIZE })
  );

  const {
    videos: allVideos,
    isLoading: isLoadingAll,
    error: errorAll,
    loadMore: loadMoreAll
  } = useVideoFetch(
    "videoAllVideosGet",
    (skip) => videoApi.videoAllVideosGet({ skip, take: PAGE_SIZE })
  );

  if (errorAll || errorSubscribed) 
    return `An error has occurred: ${errorAll?.message || errorSubscribed?.message}`;

  return (
    <Container maxWidth="xl">
      <VideoList
        videos={subscribedVideos}
        onLoadMore={loadMoreSubscribed}
        title="Subscribed"
        isLoading={isLoadingSubscribed}
      />
      <VideoList
        videos={allVideos}
        onLoadMore={loadMoreAll}
        title="More Videos"
        isLoading={isLoadingAll}
      />
    </Container>
  );
}
