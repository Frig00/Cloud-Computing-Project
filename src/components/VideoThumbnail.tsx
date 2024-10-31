import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

interface VideoThumbnailProps {
  src: string;
  alt: string;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ src, alt }) => {
  const navigate = useNavigate();

  return (
      <div onClick={() => navigate('/watch?v=test', {replace: false})}>
        <Card sx={{ width: 300, cursor: "pointer" }}>
          <CardMedia
            sx={{ height: 169 }}
            image="https://picsum.photos/300/169"
            title="Title"
          />
          <CardContent sx={{ padding: "4px", paddingBottom: "4px !important" }}>
            <Typography variant="h5" component="div">
              {"{videoTitle}"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              by {"{user}"}
            </Typography>
          </CardContent>
        </Card>
      </div>
  );
};

export default VideoThumbnail;
