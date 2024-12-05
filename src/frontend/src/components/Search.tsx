import { Container } from "@mui/material";
import VideoThumbnail from "./VideoThumbnail";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Search() {
  
  
  // const pet = new StoreApi();

  // const { isPending, error, data } = useQuery({
  //   queryKey: ['repoData'],
  //   queryFn: () => pet.getInventory(),
  // })

  // if (isPending) return 'Loading...'

  // if (error) return 'An error has occurred: ' + error.message

  return (
    <Container maxWidth="xl">
      <div className="flex gap-2 flex-wrap m-2">
        {/* <VideoThumbnail src="" variant="horizontal" />
        <VideoThumbnail src="" variant="horizontal" />
        <VideoThumbnail src="" variant="horizontal" />
        <VideoThumbnail src="" variant="horizontal" /> */}
      </div>
    </Container>
  );
}
