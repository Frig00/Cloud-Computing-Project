import styled from "@emotion/styled";
import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoPreview from "./VideoPreview";
import { masterPlaylistSrc } from "@/lib/consts";

interface VideoThumbnailProps {
  id: string;
  src: string;
  title: string;
  user: string;
  variant: "small" | "horizontal";
}


const Title = styled(Typography)(() => ({
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflow: "hidden",
}));

const VideoThumbnail = (props: VideoThumbnailProps) => {
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onClick={() =>
        navigate("/watch?v=" + props.id, {
          replace: false,
        })
      }
      style={{
        width: props.variant == "horizontal" ? "100%" : undefined,
      }}
    >
      <Card
        sx={{
          width: props.variant == "small" ? 300 : null,
          cursor: "pointer",
          display: props.variant == "horizontal" ? "flex" : null,
        }}
      >
        <CardMedia>
          <div onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
            height: 169,
            width: props.variant == "horizontal" ? 300 : "inherit"
          }}>
            <VideoPreview src={masterPlaylistSrc(props.id)} thumbnail={props.src} />
          </div>
        </CardMedia>
        <CardContent
          sx={{
            padding: "4px",
            paddingBottom: "4px !important",
          }}
        >
          <Title variant="h5">{props.title}</Title>
          <Typography variant="body2" color="text.secondary">
            by {props.user}
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoThumbnail;
