import { VideoApi, VideoVideoIdCommentsGet200ResponseCommentsInner } from "@/api";
import { useAuth } from "@/services/authService";
import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import UserAvatar from "../UserAvatar";



interface CommentSectionProps {
  videoId: string;
}
export default function CommentSection({videoId}: CommentSectionProps) {

  const videoApi = new VideoApi();
  const auth = useAuth();
  const [commentsNumber,setCommentsNumber] = useState(5);
  const [skip,setSkip] = useState(0);


  const { isPending, error, data } = useQuery({
    queryKey: ["videoVideoIdCommentsGet",skip,commentsNumber, videoId],
    queryFn: () =>
      videoApi.videoVideoIdCommentsGet({
        skip: skip,
        take: commentsNumber,
        videoId: videoId,
        
      }),
  });

  useEffect(() => {
    if (data) {
      setComments([...comments,...data.comments]);
    }
  }, [data]);
  
  const [comments, setComments] = useState<VideoVideoIdCommentsGet200ResponseCommentsInner[]>([]);
  const [newComment, setNewComment] = useState("");


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      if (newComment.trim()) {
      const comment: VideoVideoIdCommentsGet200ResponseCommentsInner = {
        id: new Date().toISOString(), // In a real app, this would be a UUID
        user: {
          userId: auth.user?.userId ?? "",
          profilePictureUrl: auth.user?.profilePictureUrl ?? null,
        },
        text: newComment.trim(),
        timeStamp: new Date(),
      };
      setComments([comment, ...comments]);
      videoApi.videoVideoIdCommentPost({
        videoId : videoId,
        videoVideoIdCommentPostRequest : {comment: newComment.trim(),},
        
      })

      setNewComment("");
    }
      
  };

  const handleLoadMore = () => {
    setSkip(skip + 5);
  }

  return (
    <Box margin="auto">
      <Typography variant="h1" marginTop={"0.5rem"} fontWeight={500} fontSize={"1.2rem"}>
        Comments
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField fullWidth multiline rows={1} variant="outlined" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{
            marginTop: "0.5rem",
          }}
        >
          Post Comment
        </Button>
      </form>

      <List>
        {comments.map((comment) => (
          <ListItem
            key={comment.id}
            alignItems="flex-start"
            sx={{
              padding: 0,
            }}
          >
            <ListItemAvatar>
              <UserAvatar user={{ userId: comment.user.userId, profilePictureUrl: comment.user.profilePictureUrl, name: "na" }} userId={""} />
            </ListItemAvatar>
            <ListItemText
              primary={
                <>
                  <Typography component="span" variant="subtitle1" color="text.primary">
                    {comment.user.userId}
                  </Typography>
                  {" — "}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {formatDistanceToNow(comment.timeStamp, { addSuffix: true })}
                  </Typography>
                </>
              }
              secondary={comment.text}
            />
          </ListItem>
        ))}
      </List>
      <Button
          variant="outlined"
          color="primary"
          sx={{
            marginTop: "0.5rem",
          }}
          onClick={handleLoadMore}
        >
          Load More
        </Button>
    </Box>
  );
}
