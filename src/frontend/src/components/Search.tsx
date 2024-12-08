import { Container } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "@/api";
import { useSearchParams } from "react-router-dom";

export default function Search() {

  const [searchParams] = useSearchParams();
  const searchedTitle = searchParams.get("q")!;
  
  
  const videoApi = new VideoApi();

  

  const {isPending,error,data}  = useQuery({
    queryKey: ['videoSearchPost'],
    queryFn: () => videoApi.videoSearchPost({
      q: searchedTitle
    }),
  })

  

  if (isPending) return 'Loading...'

  if (error) return 'An error has occurred: ' + error.message

  

  return (
    <Container maxWidth="xl">
      <div className="flex gap-2 flex-wrap m-2">
        {data.map(video => <VideoThumbnail id={video.id} src={""} title={video.title} user={""} key={video.id} variant="horizontal" />)}
      </div>
    </Container>
  );
}
