import { Container } from "@mui/material";
import VideoThumbnail from "./components/VideoThumbnail";
import { useQuery } from "@tanstack/react-query";
import { VideoApi } from "./api";

export default function HomePage() {
    const videoApi = new VideoApi();

    const { isPending, error, data } = useQuery({
        queryKey: ['videoAllVideosGet'],
        queryFn: () => videoApi.videoAllVideosGet(),
    })

    if (isPending) return 'Loading...'

    if (error) return 'An error has occurred: ' + error.message

    const getThumbnail = (id: string) => {
        return `http://localhost:9000/video-encoded/${id}/thumbnail.jpg`
    }

    return (<Container maxWidth="xl">
        <div className="flex gap-2 flex-wrap m-2">
            {data.map(video => <VideoThumbnail id={video.id} src={getThumbnail(video.id)} title={video.title} user={video.userId} variant="small" />)}
            
        </div>
    </Container>);
}