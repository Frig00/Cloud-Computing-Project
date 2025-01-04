/* eslint-disable prettier/prettier */
import { Button, Container } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoAllVideosGet200ResponseInner, VideoApi } from "../api";
import { thumbnailSrc } from "../lib/consts";
import { useEffect, useState } from "react";


export default function HomePage() {

  const [skip,setSkip] = useState(0);
  const [videos,setVideos] = useState<VideoAllVideosGet200ResponseInner[]>([]);
  const TAKE = 100;
  const videoApi = new VideoApi();

  const { isPending, error, data } = useQuery({
    queryKey: ["videoAllVideosGet",skip,TAKE],
    queryFn: () => videoApi.videoAllVideosGet({skip: skip,take: TAKE}),
  });

  /*

  this must be the look of the second query

  const { isPending: isPending2, error: error2, data: data2 } = useQuery({
    queryKey: ["videoAllVideosGet",skip,TAKE],
    queryFn: () => videoApi.videoVideoIdIsSubscribedGet,
  });

  */

    useEffect(() => {
      if (data) {
        setVideos([...(videos || []),...data.map((video) => video)]);
      }
    }, [data]);

    useEffect(() => {
      setVideos([]);
      setSkip(0);
    }, []);

    if (isPending) return "Loading...";
    if (error) return "An error has occurred: " + error.message;
  

  const handleLoadMore = () => {setSkip(skip + TAKE);};

  return (
    <Container maxWidth="xl">
      <div className="flex gap-2 flex-wrap m-2">
        {videos?.map((video, index) => (
          <VideoThumbnail id={video.id} src={thumbnailSrc(video.id)} title={video.title} user={video.userId} key={`${video.id}-${index}`} variant="small" />
        ))}
      </div>
      <Button
          variant="outlined"
          color="primary"
          sx={{
            marginTop: "0.5rem",
          }}
          onClick={handleLoadMore}
        >
          Load More
        </Button>
    </Container>
    
  );
}
