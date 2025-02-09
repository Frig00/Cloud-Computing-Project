import { Button, Card, Container, Grid2 as Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, Alert } from "@mui/material";
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
import { QualitySelector } from "./QualitySelector";

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

  const { isPending, error, data: videoData } = useQuery({
    queryKey: ["videoVideoIdGet", videoId],
    queryFn: () =>
      videoApi.videoVideoIdGet({
        videoId,
      }),
  });

  const { 
    isPending: isSubscriptionPending, 
    error: subscriptionError, 
    data: subscriptionData 
  } = useQuery({
    queryKey: ["userUserIdSubscribeGet", videoData?.userId],
    queryFn: () => {
      if (videoData?.userId) {
        return userApi.userUserIdSubscribeGet({ userId: videoData.userId });
      }
      return Promise.reject(new Error("User ID is undefined"));
    },
  });

  const [selectedActions, setSelectedActions] = useState<string[]>(() => []);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false); 
  const [subscribed, setSubscribed] = useState(false);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<Quality | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hasConfirmedSensitiveContent, setHasConfirmedSensitiveContent] = useState(false);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    setLikes(videoData?.likes ?? 0);
    setIsLiked(videoData?.userHasLiked ?? false); 
    setSubscribed(subscriptionData?.subscriptionStatus ?? false);
    setSelectedActions((prevActions) => {
      let newActions = [...prevActions];
  
      if (videoData?.userHasLiked && !newActions.includes("like")) {
        newActions.push("like");
      } else if (!videoData?.userHasLiked && newActions.includes("like")) {
        newActions = newActions.filter((item) => item !== "like");
      }
  
      if (subscriptionData?.subscriptionStatus && !newActions.includes("subscribe")) {
        newActions.push("subscribe");
      } else if (!subscriptionData?.subscriptionStatus && newActions.includes("subscribe")) {
        newActions = newActions.filter((item) => item !== "subscribe");
      }
  
      return newActions;
    });
  }, [videoData, subscriptionData]);

  const refCallback = (element: HTMLVideoElement) => {
    if (element) {
      setVideoElement(element);
    }
  };

  const handleFormat = (event: React.MouseEvent<HTMLElement>, newActions: string[]) => {
    setSelectedActions(newActions);
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

  const onTimeUpdate = useCallback(() => {
    if (!videoElement) return;
    setCurrentTime(videoElement.currentTime);
  }, [videoElement]);

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;

  async function handleLike() {
    const newLikes = await videoApi.videoVideoIdLikePost({
      videoId: videoId,
      videoVideoIdLikePostRequest: { isLiking: !isLiked }
    });
    setLikes(newLikes.likes);
    setIsLiked(!isLiked);
    setSelectedActions(prev => {
      if (!isLiked) {
        return [...prev, 'like'];
      } else {
        return prev.filter(format => format !== 'like');
      }
    });
  }

  async function handleSubscribe() {
    await userApi.userUserIdSubscribePost({
      userId: videoData?.userId ?? "", 
      userUserIdSubscribePostRequest: { isUserSubscribed: !subscribed }
    });
    setSubscribed(!subscribed);
    setSelectedActions(prev => {
      if (!subscribed) {
        return [...prev, 'subscribe'];
      } else {
        return prev.filter(format => format !== 'subscribe');
      }
    });
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

  const handleQualityChange = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
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
            {videoData.moderationTypes && videoData.moderationTypes.length > 0 && !hasConfirmedSensitiveContent ? (
              <SensitiveContentWarning 
                moderationTypes={videoData.moderationTypes}
                onConfirm={() => setHasConfirmedSensitiveContent(true)}
              />
            ) : (
              <video ref={refCallback} controls onTimeUpdate={onTimeUpdate} />
            )}

            <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"}>
              <Stack>
                <Typography variant="h1" marginTop={"0.5rem"} fontWeight={700} fontSize={"1.5rem"}>
                  {videoData.title}
                </Typography>
                <Typography variant="body1" className="mt-2">
                  {videoData.userId}
                </Typography>
              </Stack>
              <ToggleButtonGroup color="primary" aria-label="Basic button group" value={selectedActions} onChange={handleFormat}>
                <ToggleButton
                  value="subscribe"
                  onClick={handleSubscribe}
                  sx={{
                    gap: "0.5rem",
                  }}
                >
                  {selectedActions.includes("subscribe") ? <Subscriptions /> : <SubscriptionsOutlined />}
                  <span>{selectedActions.includes("subscribe") ? "Subscribed" : "Subscribe"}</span>
                </ToggleButton>
                <ToggleButton
                  value="like"
                  onClick={handleLike}
                  sx={{
                    gap: "0.5rem",
                  }}
                >
                  {selectedActions.includes("like") ? <ThumbUp /> : <ThumbUpOutlined />}
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
                  {`${formatDistanceToNow(videoData.uploadDate, { addSuffix: true })} — ${videoData.views} views`}
                </Typography>
                <span>{videoData.description}</span>
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
              {qualities.length > 0 && (
                <QualitySelector
                  qualities={qualities}
                  currentQuality={currentQuality}
                  onQualityChange={handleQualityChange}
                />
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
