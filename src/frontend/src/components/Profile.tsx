/* eslint-disable prettier/prettier */

import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "@/api";
import { useSearchParams } from "react-router-dom";
import { thumbnailSrc } from "../lib/consts";
import { Container } from "@mui/material";
import UserAvatar from "./UserAvatar";
import { useAuth } from "@/services/authService";


export default function Profile() {

    const [searchParams] = useSearchParams();
    const searchedUser = searchParams.get("userId")!;
    const videoApi = new VideoApi();
    const auth = useAuth();

  
  
    const { isPending, error, data, refetch } = useQuery({
      queryKey: ["videoUserUserIdVideosGet"],
      queryFn: () => videoApi.videoUserUserIdVideosGet({userId: searchedUser}),
    });
 
    if (isPending) return "Loading...";
  
    if (error) return "An error has occurred: " + error.message;
  
    return (
      
      <Container maxWidth="xl">
        <UserAvatar user={auth.user} userId={auth.user?.name!} />
        <div className="flex gap-2 flex-wrap m-2">
          {data.map((video) => (
            <VideoThumbnail id={video.id} src={thumbnailSrc(video.id)} title={video.title} user={video.userId} key={video.id} variant="delete" onDelete={refetch} />
          ))}
        </div>
      </Container>
    );

}