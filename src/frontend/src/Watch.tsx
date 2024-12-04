import { Container, Link, Stack, Typography } from "@mui/material";
import HLS from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VideoApi } from "./api";
import { useQuery } from "@tanstack/react-query";

type Quality = {
  height: number;
  width: number;
  bitrate: number;
  name: string;
  index: number;
};


export default function Watch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoId = searchParams.get("v")!;
  const hlsRef = useRef<HLS | null>(null);

  
  const videoApi = new VideoApi();
  
  const { isPending, error, data } = useQuery({
    queryKey: ['videoVideoIdGet', videoId],
    queryFn: () => videoApi.videoVideoIdGet({ videoId }),
  })
  

  
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  // Ref callback
  const refCallback = (element: HTMLVideoElement) => {
    if (element) {
      setVideoElement(element);
    }
  };

  const src = `http://localhost:9000/video-encoded/${videoId}/master.m3u8`


  
  const initPlayer = useCallback(() => {
    if (!videoElement) return;

    if (hlsRef.current) hlsRef.current.destroy();
    if (HLS.isSupported()) {
      hlsRef.current = new HLS({
        debug: false,
      });
  
      console.log("HLS supported");
  
      hlsRef.current.loadSource(src);
      hlsRef.current.attachMedia(videoElement);
      hlsRef.current.on(HLS.Events.MANIFEST_PARSED, (event, data) => {
        videoElement.play()
          .catch((error) => console.log("Error playing video:", error));

        const availableQualities = data.levels.map((level, index) => ({
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`,
          index: index
        }));
        setQualities(availableQualities);
        console.log(availableQualities);
      });

      hlsRef.current.on(HLS.Events.LEVEL_SWITCHED, (event, data) => {
        const newQuality = hlsRef.current!.levels[data.level];
        setCurrentQuality({
          height: newQuality.height,
          width: newQuality.width,
          bitrate: newQuality.bitrate,
          name: `${newQuality.height}p`,
          index: data.level
        });
      });

    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = src;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play()
          .catch((error) => console.log("Error playing video:", error));
      });
    }

  }, [videoElement, src]);

  useEffect(() => {
    initPlayer();
  
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initPlayer]);




  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(2)} Mbps`;
  };

  
  if (isPending) return 'Loading...'
  
  if (error) return 'An error has occurred: ' + error.message

  return (
    <Container maxWidth="xl">
      <Stack>
        <video
          className="mt-4"
          ref={refCallback}
          controls
          style={{marginBottom: "0.5rem"}}
        />
        <Typography variant="h1" className="mt-4" fontWeight={700} fontSize={"1.5rem"}>{data.title}</Typography>
        <Typography variant="body1" className="mt-2">
          {data.title}
        </Typography>

        {/* Display current quality */}
        {currentQuality && (
          <div style={{ marginTop: '10px' }}>
            <h3>Current Quality:</h3>
            <p>
              Resolution: {currentQuality.width}x{currentQuality.height}<br />
              Bitrate: {formatBitrate(currentQuality.bitrate)}
            </p>
          </div>
        )}

        {/* Display available qualities */}
        {qualities.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <h3>Available Qualities:</h3>
            <table style={{ width: '100%', maxWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Quality</th>
                  <th>Resolution</th>
                  <th>Bitrate</th>
                </tr>
              </thead>
              <tbody>
                {qualities.map((quality) => (
                  <tr
                    key={quality.index}
                    style={{
                      backgroundColor:
                        currentQuality?.index === quality.index
                          ? '#e0e0e0'
                          : 'transparent'
                    }}
                  >
                    <td><Link href="#" onClick={() => { if (hlsRef.current) hlsRef.current.currentLevel = quality.index; }}>
                      {quality.name}
                    </Link>
                      </td>
                    <td>{quality.width}x{quality.height}</td>
                    <td>{formatBitrate(quality.bitrate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </Stack>
    </Container>
  );
}
