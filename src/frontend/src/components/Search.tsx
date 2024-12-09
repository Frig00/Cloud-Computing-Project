import { Container } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "@/api";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { thumbnailSrc } from "../lib/consts";

export default function Search() {


  const [searchParams] = useSearchParams();
  const searchedTitle = searchParams.get("q")!;
  const videoApi = new VideoApi();

  const { isPending, error, data,refetch } = useQuery({
    queryKey: ["videoSearchPost"],
    queryFn: () =>
      videoApi.videoSearchPost({
        q: searchedTitle,
      }),
  });

  useEffect(() => {
    if (searchedTitle) {
      refetch();
    }
  }, [searchedTitle, refetch]);

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;

  return (
    <Container maxWidth="xl">
      <div className="flex gap-2 flex-wrap m-2">
        {data.map((video) => (
          <VideoThumbnail
            id={video.id}
            src={thumbnailSrc(video.id)}
            title={video.title}
            user={video.userId}
            key={video.id}
            variant="horizontal"
          />
        ))}
      </div>
    </Container>
  );
}
