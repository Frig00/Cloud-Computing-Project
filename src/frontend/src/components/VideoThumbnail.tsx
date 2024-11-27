import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

interface VideoThumbnailProps {
  src: string;
  alt: string;
  variant: "small" | "horizontal";
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ src, alt, variant }) => {
  const navigate = useNavigate();

  return (
      <div onClick={() => navigate('/watch?v=test', {replace: false})} style={{ width: variant == "horizontal" ? "100%" : undefined}}>
        <Card sx={{ width: variant == "small" ? 300 : null, cursor: "pointer", display: variant == "horizontal" ? "flex": null }}>
          <CardMedia
            sx={{ height: 169, width: variant == "horizontal" ? 300 : "inherit" }}
            image="https://picsum.photos/300/169"
            title="Title"
          />
          <CardContent sx={{ padding: "4px", paddingBottom: "4px !important" }}>
            <Typography variant="h5" component="div">
              {"{videoTitle}"}
            </Typography>11
            <Typography variant="body2" color="text.secondary">
              by {"{user}"}
            </Typography>
          </CardContent>
        </Card>
      </div>
  );
};

export default VideoThumbnail;
