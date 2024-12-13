import { Card, Container, Grid2 as Grid, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import HLS from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VideoApi } from "../../api";
import { useQuery } from "@tanstack/react-query";
import { parseVTT, sampleVTT } from "../Bench/Bench";
import clsx from "clsx";

import AWSTranscribe from "../../assets/aws_transcribe.svg";
import { masterPlaylistSrc } from "../../lib/consts";
import { Subscriptions, SubscriptionsOutlined, ThumbUp, ThumbUpOutlined } from "@mui/icons-material";
import CommentSection from "./CommentSection";
import { formatDistanceToNow } from "date-fns";

type Quality = {
  height: number;
  width: number;
  bitrate: number;
  name: string;
  index: number;
};

export default function Watch() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("v")!;
  const hlsRef = useRef<HLS | null>(null);

  const videoApi = new VideoApi();

  const { isPending, error, data } = useQuery({
    queryKey: ["videoVideoIdGet", videoId],
    queryFn: () =>
      videoApi.videoVideoIdGet({
        videoId,
      }),
  });
  
  const [formats, setFormats] = useState<string[]>(() => []);
  const [likes,setLikes] = useState(0);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  const [cues, setCues] = useState<Array<{
    start: number;
    end: number;
    text: string;
    formattedStart: string;
  }> | null>(null);
  const [activeCue, setActiveCue] = useState<number | null>(null);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  

  useEffect(() => {
    setLikes(data?.likes ?? 0);
    setFormats(prevArray => {
      // Check if "like" is already in the array, if not add it
      if (data?.userHasLiked  && !prevArray.includes('like')) {
        return [...prevArray, 'like']; // Add "like"
      } else if (!data?.userHasLiked  && prevArray.includes('like')) {
        // Remove "like" if userHasLiked is false
        return prevArray.filter(item => item !== 'like');
      }
      return prevArray; // Return the same array if no change needed
    });
  }, [data]);
  
  
  

  // Ref callback
  const refCallback = (element: HTMLVideoElement) => {
    if (element) {
      setVideoElement(element);
    }
  };


  const handleFormat = (event: React.MouseEvent<HTMLElement>, newFormats: string[]) => {
    setFormats(newFormats);
  };

  const src = masterPlaylistSrc(videoId);
  
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
        videoElement.play().catch((error) => console.log("Error playing video:", error));

        const availableQualities = data.levels.map((level, index) => ({
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p`,
          index: index,
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
          index: data.level,
        });
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = src;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch((error) => console.log("Error playing video:", error));
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

  useEffect(() => {
    setCues(parseVTT(sampleVTT));
  }, []);

  useEffect(() => {
    if (!activeCue) return;
    const container = document.querySelector(".subtitle-container") as HTMLElement;
    const containerRect = container.getBoundingClientRect();
    const cueElement = document.querySelector(`.subtitle-cue[data-index="${activeCue}"]`);
    const elementRect = cueElement!.getBoundingClientRect();

    const offsetTop = elementRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
      top: offsetTop,
      behavior: "smooth", // or "auto"
    });
  }, [activeCue]);

  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(2)} Mbps`;
  };

  const onTimeUpdate = () => {
    // get the first cue that starts after the current time
    const currentTime = videoElement?.currentTime;
    if (!currentTime || !cues) return;
    const nextCue = cues?.find((cue) => cue.start > currentTime);
    if (nextCue) {
      const index = cues.indexOf(nextCue) - 1;
      setActiveCue(index);
    }
  };

  const handleCueClick = (index: number) => {
    setActiveCue(index);
    if (videoElement) {
      videoElement.currentTime = cues![index].start;
    }
  };

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;

  function handleLike (){
    videoApi.videoVideoIdLikeGet({videoId,isLiking : !formats.includes("like")});
    formats.includes("like") ? setLikes(likes -1):setLikes(likes +1);
   
  }
  
  return (
    <Container maxWidth="xl" className="mt-4">
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            lg: 8,
          }}
        >
          <Stack>
            <video ref={refCallback} controls onTimeUpdate={onTimeUpdate} />

            <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
              <Stack>
                <Typography variant="h1" marginTop={"0.5rem"} fontWeight={700} fontSize={"1.5rem"}>
                  {data.title}
                </Typography>
                <Typography variant="body1" className="mt-2">
                  {data.userId}
                </Typography>
              </Stack>
              <ToggleButtonGroup color="primary" aria-label="Basic button group" value={formats} onChange={handleFormat}>
                <ToggleButton
                  value="subscribe"
                  sx={{
                    gap: "0.5rem",
                  }}
                >
                  {formats.includes("subscribe") ? <Subscriptions /> : <SubscriptionsOutlined />}
                  <span>{formats.includes("subscribe") ? "Subscribed" : "Subscribe"}</span>
                </ToggleButton>
                <ToggleButton
                  value="like"
                  onClick={handleLike}
                  sx={{
                    gap: "0.5rem",
                  }}
                >
                  {formats.includes("like") ? <ThumbUp /> : <ThumbUpOutlined />}
                  <span>Like ({likes})</span>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Card
              variant="outlined"
              sx={{
                padding: "0.5rem",
              }}
            >
              <Stack>
                <Typography component="span" variant="body2" color="text.secondary">
                  {`${formatDistanceToNow(data.uploadDate, { addSuffix: true })} — ${data.views} views`}
                </Typography>
                <span>{data.description}</span>
              </Stack>
            </Card>
          </Stack>
        </Grid>

        <Grid
          size={{
            xs: 12,
            lg: 4,
          }}
          container
          spacing={2}
          direction={"column"}
        >
          <Grid
            size={{
              xs: 12,
              lg: 12,
            }}
          >
            <Card
              variant="outlined"
              className="subtitle-panel"
              sx={{ overflowY: "scroll" }}
            >
              <div className="subtitle-container">
                {cues
                  ? cues.map((cue, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: "8px",
                      }}
                      className={clsx("subtitle-cue", activeCue == index ? "active" : null)}
                      data-index={index}
                      onClick={() => handleCueClick(index)}
                    >
                      <div className="cue-time">{cue.formattedStart}</div>
                      <div>{cue.text}</div>
                    </div>
                  ))
                  : null}
              </div>
              <div className="subtitle-pb">
                <img
                  src={AWSTranscribe}
                  alt="AWS Transcribe"
                  style={{
                    width: "48px",
                    borderRadius: "4px",
                  }}
                />
                <span>
                  Powered by
                  <br />
                  <b>AWS Transcribe</b>
                </span>
              </div>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              lg: 12,
            }}
          >
              {/* Display available qualities */}
              {qualities.length > 0 && (
                <table
                  style={{
                    width: "100%",
                  }}
                  className="quality-grid"
                >
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
                          backgroundColor: currentQuality?.index === quality.index ? "#e0e0e0" : "transparent",
                        }}
                      >
                        <td>
                          <Link
                            href="#"
                            onClick={() => {
                              if (hlsRef.current) hlsRef.current.currentLevel = quality.index;
                            }}
                          >
                            {quality.name}
                          </Link>
                        </td>
                        <td>
                          {quality.width}x{quality.height}
                        </td>
                        <td>{formatBitrate(quality.bitrate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </Grid>
        </Grid>
        <Grid
          size={{
            xs: 12,
            lg: 8,
          }}
        >
          <CommentSection />
        </Grid>
      </Grid>
    </Container>
  );
}
