
import VideoThumbnail from "./VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "@/api";
import { useSearchParams } from "react-router-dom";
import { thumbnailSrc } from "../lib/consts";
import { Container } from "@mui/material";
import UserAvatar from "./UserAvatar";


export default function Profile() {

    const [searchParams] = useSearchParams();
    const searchedUser = searchParams.get("userId")!;
    const videoApi = new VideoApi();

  
  
    const { isPending, error, data } = useQuery({
      queryKey: ["videoUserUserIdVideosGet"],
      queryFn: () => videoApi.videoUserUserIdVideosGet({userId: searchedUser}),
    });
 
    if (isPending) return "Loading...";
  
    if (error) return "An error has occurred: " + error.message;
  
    return (
      
      <Container maxWidth="xl">
        <UserAvatar user={null} userId={searchedUser} />
        <div className="flex gap-2 flex-wrap m-2">
          {data.map((video) => (
            <VideoThumbnail id={video.id} src={thumbnailSrc(video.id)} title={video.title} user={video.userId} key={video.id} variant="horizontal" />
          ))}
        </div>
      </Container>
    );

}