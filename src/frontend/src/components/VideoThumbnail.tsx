import styled from "@emotion/styled";
import { Button, Card, CardContent, CardMedia, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoPreview from "./VideoPreview";
import { masterPlaylistSrc } from "@/lib/consts";
import { Trash2 } from "lucide-react";
import { VideoApi } from "@/api";

interface VideoThumbnailProps {
  id: string;
  src: string;
  title: string;
  user: string;
  variant: "small" | "horizontal" | "delete";
  disablePreview?: boolean;
  disableLink?: boolean;
  onDelete?: () => void;
}

const Title = styled(Typography)(() => ({
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflow: "hidden",
}));

const VideoThumbnail = (props: VideoThumbnailProps) => {
  const videoApi = new VideoApi();
  const [hover, setHover] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setOpenDialog(false);
    await videoApi.videoVideoIdDelete({ videoId: props.id });
    if (props.onDelete) props.onDelete();
  };

  const thumbWidth = props.variant === "horizontal" || props.variant === "delete" ? 300 : undefined;
  const clickable = !props.disableLink;

  return (
    <>
      <div
        onClick={clickable ? () => navigate("/watch?v=" + props.id) : undefined}
        style={{
          width: props.variant === "horizontal" || props.variant === "delete" ? "100%" : undefined,
          cursor: clickable ? 'pointer' : 'default'
        }}
      >
        <Card
          sx={{
            width: props.variant == "small" ? 300 : null,
            cursor: clickable ? 'pointer' : 'default',
            display: props.variant == "horizontal" || props.variant === "delete" ? "flex" : null,
          }}
        >
          {props.disablePreview ? (
            <CardMedia
              component="img"
              image={props.src}
              sx={{ height: 169, width: thumbWidth, objectFit: 'cover' }}
            />
          ) : (
            <CardMedia>
              <div
                onMouseOver={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{ height: 169, width: thumbWidth ?? 'inherit', overflow: 'hidden' }}
              >
                <VideoPreview src={masterPlaylistSrc(props.id)} thumbnail={props.src} />
              </div>
            </CardMedia>
          )}
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
            {props.variant === "delete" && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDialog(true);
                }}
                sx={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                  },
                }}
              >
                <Trash2 />
              </IconButton>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this video?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoThumbnail;
