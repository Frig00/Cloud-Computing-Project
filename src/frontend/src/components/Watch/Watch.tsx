/* eslint-disable prettier/prettier */
import { Button, Card, Container, Grid2 as Grid, Link, Stack, ToggleButton, ToggleButtonGroup, Typography, Alert } from "@mui/material";
import HLS from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserApi, VideoApi } from "../../api";
import { useQuery } from "@tanstack/react-query";


import { masterPlaylistSrc } from "../../lib/consts";
import { Subscriptions, SubscriptionsOutlined, ThumbUp, ThumbUpOutlined } from "@mui/icons-material";
import CommentSection from "./CommentSection";
import { formatDistanceToNow } from "date-fns";
import Transcription from "./Transcription";

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
  const userApi = new UserApi();

  const { isPending, error, data } = useQuery({
    queryKey: ["videoVideoIdGet", videoId],
    queryFn: () =>
      videoApi.videoVideoIdGet({
        videoId,
      }),
  });

  

  const { isPending: isPending2, error: error2, data: data2 } = useQuery({
    queryKey: ["userUserIdSubscribeGet",data?.userId],
    queryFn: () => {
      if (data?.userId) {
        return userApi.userUserIdSubscribeGet({ userId: data.userId });
      }
      return Promise.reject(new Error("User ID is undefined"));
    },
  });

  
  
  const [formats, setFormats] = useState<string[]>(() => []);
  const [likes,setLikes] = useState(0);
  const [subscribed,setSubscribed] = useState(false);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hasConfirmedSensitiveContent, setHasConfirmedSensitiveContent] = useState(false);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  
  useEffect(() => {
    setLikes(data?.likes ?? 0);
    setSubscribed(data2?.subscriptionStatus ?? false);
    setFormats((prevArray) => {
      let newArray = [...prevArray];
  
      // Manage "like" status
      if (data?.userHasLiked && !newArray.includes("like")) {
        newArray.push("like");
      } else if (!data?.userHasLiked && newArray.includes("like")) {
        newArray = newArray.filter((item) => item !== "like");
      }
  
      // Manage "subscribe" status
      if (data2?.subscriptionStatus && !newArray.includes("subscribe")) {
        newArray.push("subscribe");
      } else if (!data2?.subscriptionStatus && newArray.includes("subscribe")) {
        newArray = newArray.filter((item) => item !== "subscribe");
      }
  
      return newArray;
    });
  }, [data, data2]);
  
  

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

  

  

  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000000).toFixed(2)} Mbps`;
  };

  const onTimeUpdate = useCallback(() => {
    if (!videoElement) return;
    setCurrentTime(videoElement.currentTime);
  }, [videoElement]);

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;

  async function handleLike (){
    const newLikes = await videoApi.videoVideoIdLikePost({videoId: videoId,videoVideoIdLikePostRequest: {isLiking: !data?.userHasLiked}});
    setLikes(newLikes.likes);
  }

  
  async function handleSubscribe (){
    userApi.userUserIdSubscribePost({userId: data?.userId ?? "", userUserIdSubscribePostRequest: {isUserSubscribed: !subscribed}});
 
  }
  
  const setVideoTime = (time: number) => {
    if (!videoElement) return;
    videoElement.currentTime = time;
  }

  const SensitiveContentWarning = ({ moderationTypes, onConfirm }: { moderationTypes: string[], onConfirm: () => void }) => {
    return (
      <Alert 
        severity="warning"
        
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            Content Warning
          </Typography>
          <Typography variant="body1">
            This video may contain sensitive content related to:
          </Typography>
          <ul style={{ margin: 0 }}>
            {moderationTypes.map((type, index) => (
              <li key={index}>{type}</li>
            ))}
          </ul>
          <Button 
            variant="contained" 
            color="warning" 
            size="large" 
            fullWidth 
            onClick={onConfirm}
            sx={{
              mt: 2,
              fontWeight: 'bold'
            }}
          >
            I Understand and Wish to Continue
          </Button>
        </Stack>
      </Alert>
    );
  };


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
            {data.moderationTypes && data.moderationTypes.length > 0 && !hasConfirmedSensitiveContent ? (
              <SensitiveContentWarning 
                moderationTypes={data.moderationTypes}
                onConfirm={() => setHasConfirmedSensitiveContent(true)}
              />
            ) : (
              <video ref={refCallback} controls onTimeUpdate={onTimeUpdate} />
            )}

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
                  onClick={handleSubscribe}
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
            <Transcription videoId={videoId} onCueClick={setVideoTime} currentTime={currentTime} />
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
          <CommentSection videoId={videoId} />
        </Grid>
      </Grid>
    </Container>
  );
}
