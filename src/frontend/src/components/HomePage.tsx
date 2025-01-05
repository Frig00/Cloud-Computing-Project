/* eslint-disable prettier/prettier */
import { Button, Container, Typography } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoAllVideosGet200ResponseInner, VideoApi } from "../api";
import { thumbnailSrc } from "../lib/consts";
import { useEffect, useState } from "react";


export default function HomePage() {

  const [skip,setSkip] = useState(0);
  const [skipS,setSkipS] = useState(0);
  const [videos,setVideos] = useState<VideoAllVideosGet200ResponseInner[]>([]);
  const [videosS,setVideosS] = useState<VideoAllVideosGet200ResponseInner[]>([]);
  const TAKE = 100;
  const videoApi = new VideoApi();

  const { isPending, error, data } = useQuery({
    queryKey: ["videoAllVideosGet",skip,TAKE],
    queryFn: () => videoApi.videoAllVideosGet({skip: skip,take: TAKE}),
  });

  
  const { isPending: isPending2, error: error2, data: data2 } = useQuery({
    queryKey: ["videoSubscriptionsGet",skip,TAKE],
    queryFn: () => videoApi.videoSubscriptionsGet({skip: skipS, take: TAKE}),
  });

  

    useEffect(() => {
      if (data) {
        setVideos([...(videos || []),...data.map((video) => video)]);
      }
    }, [data]);

    useEffect(() => {
      if (data2) {
        setVideosS([...(videosS || []),...data2.map((video) => video)]);
      }
    }, [data2]);

    useEffect(() => {
      setVideos([]);
      setVideosS([]);
      setSkip(0);
      setSkipS(0);
    }, []);

    if (isPending) return "Loading...";
    if (error) return "An error has occurred: " + error.message;
  

  const handleLoadMore = () => {setSkip(skip + TAKE);};
  const handleLoadMoreS = () => {setSkipS(skipS + TAKE);};


  return (
    <Container maxWidth="xl">
      {videosS.length > 0 && (<Typography variant="h4" sx={{ marginTop: "1rem" }}> Subscribed </Typography>)}
        <div className="flex gap-2 flex-wrap m-2">
        {videosS?.map((video, index) => (
          <VideoThumbnail id={video.id} src={thumbnailSrc(video.id)} title={video.title} user={video.userId} key={`${video.id}-${index}`} variant="small" />
        ))}
        </div>
        {videosS.length > 0 && (
        <Button
          variant="outlined"
          color="primary"
          sx={{
            marginTop: "0.5rem",
          }}
          onClick={handleLoadMoreS}
        >
          Load More
        </Button>
      )}
      <Typography variant="h4" sx={{ marginTop: "1rem" }}> More Videos </Typography>
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
