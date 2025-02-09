import { Button, Container, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { VideoAllVideosGet200ResponseInner, VideoApi } from "../api";
import { thumbnailSrc } from "../lib/consts";
import VideoThumbnail from "./VideoThumbnail";

const PAGE_SIZE = 10;

type Video = VideoAllVideosGet200ResponseInner;

interface VideoListProps {
  videos: Video[];
  onLoadMore: () => void;
  hasNextPage?: boolean;
  title?: string;
  isLoading?: boolean;
}

const useVideoQuery = (queryKey: string[], queryFn: (skip: number) => Promise<Video[]>) => {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) => queryFn(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length >= PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });
};

const VideoList: React.FC<VideoListProps> = ({ 
  videos, 
  onLoadMore, 
  hasNextPage, 
  title, 
  isLoading 
}) => {
  if (videos.length === 0) {
    return (
      <>
        {title && <Typography variant="h4" sx={{ marginTop: "1rem" }}>{title}</Typography>}
        <Typography variant="body1" color="text.secondary" sx={{ margin: "1rem" }}>
          No videos available
        </Typography>
      </>
    );
  }

  return (
    <>
      {title && <Typography variant="h4" sx={{ marginTop: "1rem" }}>{title}</Typography>}
      <div className="flex gap-2 flex-wrap m-2">
        {videos.map((video) => (
          <VideoThumbnail
            key={video.id}
            id={video.id}
            src={thumbnailSrc(video.id)}
            title={video.title}
            user={video.userId}
            variant="small"
          />
        ))}
      </div>
      {hasNextPage && (
        <Button
          variant="outlined"
          color="primary"
          sx={{ marginTop: "0.5rem" }}
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </>
  );
};

export default function HomePage() {
  const videoApi = new VideoApi();

  const {
    data: subscribedData,
    fetchNextPage: fetchNextSubscribed,
    hasNextPage: hasNextSubscribed,
    isFetchingNextPage: isFetchingNextSubscribed,
    status: subscribedStatus
  } = useVideoQuery(
    ["videoSubscriptionsGet"],
    (skip) => videoApi.videoSubscriptionsGet({ skip, take: PAGE_SIZE })
  );

  const {
    data: allVideosData,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingNextAll,
    status: allVideosStatus
  } = useVideoQuery(
    ["videoAllVideosGet"],
    (skip) => videoApi.videoAllVideosGet({ skip, take: PAGE_SIZE })
  );

  if (allVideosStatus === 'error' || subscribedStatus === 'error') {
    return (
      <Container maxWidth="xl">
        <Typography color="error" sx={{ margin: "2rem 0" }}>
          An error has occurred loading videos
        </Typography>
      </Container>
    );
  }

  const subscribedVideos = subscribedData?.pages.flatMap(page => page) ?? [];
  const allVideos = allVideosData?.pages.flatMap(page => page) ?? [];

  return (
    <Container maxWidth="xl">
      <VideoList
        videos={subscribedVideos}
        onLoadMore={() => fetchNextSubscribed()}
        hasNextPage={hasNextSubscribed}
        title="Subscribed"
        isLoading={isFetchingNextSubscribed}
      />
      <VideoList
        videos={allVideos}
        onLoadMore={() => fetchNextAll()}
        hasNextPage={hasNextAll}
        title="More Videos"
        isLoading={isFetchingNextAll}
      />
    </Container>
  );
}
