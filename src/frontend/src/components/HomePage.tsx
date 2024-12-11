import { Container } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "../api";
import { thumbnailSrc } from "../lib/consts";

export default function HomePage() {
  const videoApi = new VideoApi();
  const { isPending, error, data } = useQuery({
    queryKey: ["videoAllVideosGet"],
    queryFn: () => videoApi.videoAllVideosGet(),
  });

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;

  return (
    <Container maxWidth="xl">
      <div className="flex gap-2 flex-wrap m-2">
        {data.map((video) => (
          <VideoThumbnail id={video.id} src={thumbnailSrc(video.id)} title={video.title} user={video.userId} key={video.id} variant="small" />
        ))}
      </div>
    </Container>
  );
}
