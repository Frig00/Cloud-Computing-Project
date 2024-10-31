import { Container, Stack, Typography } from "@mui/material";
import HLS from "hls.js";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
  const videoId = searchParams.get("v");

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

  const src = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  useEffect(() => {
    let hls: HLS;

    function initPlayer() {
      if (!videoElement) return;
      if (HLS.isSupported()) {
        hls = new HLS({
          debug: true,
        });

        console.log("HLS supported");

        hls.loadSource(src);
        hls.attachMedia(videoElement);

        hls.on(HLS.Events.MANIFEST_PARSED, (event, data) => {
          videoElement.play()
            .catch((error) => console.log("Error playing video:", error));

            const availableQualities = data.levels.map((level) => ({
                height: level.height,
                width: level.width,
                bitrate: level.bitrate,
                name: `${level.height}p`,
                index: level.urlId
            }));
            setQualities(availableQualities);
        });

        hls.on(HLS.Events.LEVEL_SWITCHED, (event, data) => {
            const newQuality = hls.levels[data.level];
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
    }

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoElement, src]);

  useEffect(() => {
    if (!videoId) {
      navigate("/", { replace: true });
    }
  }, [videoId, navigate]);

  if (!videoId) {
    return null;
  }


  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(2)} Mbps`;
  };

  return (
    <Container maxWidth="xl">
      <Stack>
        <video
          className="mt-4"
          ref={refCallback}
          controls
        />
        <Typography variant="h4" className="mt-4">{"{videoTitle}"}</Typography>
        <Typography variant="body1" className="mt-2">
          {"{description}"}
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
                  <td>{quality.name}</td>
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
