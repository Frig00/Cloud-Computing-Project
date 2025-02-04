import { VideoApi, VideoVideoIdCommentsGet200ResponseCommentsInner } from "@/api";
import { useAuth } from "@/services/authService";
import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import UserAvatar from "../UserAvatar";

interface CommentListProps {
  comments: VideoVideoIdCommentsGet200ResponseCommentsInner[];
  onLoadMore: () => void;
  isLoading?: boolean;
}

interface CommentFormProps {
  videoId: string;
  onCommentAdded: (comment: VideoVideoIdCommentsGet200ResponseCommentsInner) => void;
}

const useCommentsFetch = (videoId: string) => {
  const [skip, setSkip] = useState(0);
  const [comments, setComments] = useState<VideoVideoIdCommentsGet200ResponseCommentsInner[]>([]);
  const videoApi = new VideoApi();

  const { isPending, error, data } = useQuery({
    queryKey: ["videoVideoIdCommentsGet", skip, videoId],
    queryFn: () => videoApi.videoVideoIdCommentsGet({
      skip,
      take: 5,
      videoId,
    }),
  });

  useEffect(() => {
    if (data) {
      setComments(prev => skip === 0 ? data.comments : [...prev, ...data.comments]);
    }
  }, [data, skip]);

  useEffect(() => {
    setComments([]);
    setSkip(0);
  }, [videoId]);

  return {
    comments,
    isLoading: isPending,
    error,
    loadMore: () => setSkip(prev => prev + 5),
    addComment: (comment: VideoVideoIdCommentsGet200ResponseCommentsInner) => 
      setComments(prev => [comment, ...prev])
  };
};

const CommentForm = ({ videoId, onCommentAdded }: CommentFormProps) => {
  const [newComment, setNewComment] = useState("");
  const auth = useAuth();
  const videoApi = new VideoApi();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: VideoVideoIdCommentsGet200ResponseCommentsInner = {
      id: new Date().toISOString(),
      user: {
        userId: auth.user?.userId ?? "",
        profilePictureUrl: auth.user?.profilePictureUrl ?? null,
      },
      text: newComment.trim(),
      timeStamp: new Date(),
    };

    videoApi.videoVideoIdCommentPost({
      videoId,
      videoVideoIdCommentPostRequest: { comment: newComment.trim() },
    });

    onCommentAdded(comment);
    setNewComment("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField 
        fullWidth 
        multiline 
        rows={1} 
        variant="outlined" 
        value={newComment} 
        onChange={(e) => setNewComment(e.target.value)} 
        placeholder="Write a comment..." 
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ marginTop: "0.5rem" }}
      >
        Post Comment
      </Button>
    </form>
  );
};

const CommentList = ({ comments, onLoadMore, isLoading }: CommentListProps) => (
  <>
    <List>
      {comments.map((comment) => (
        <ListItem
          key={comment.id}
          alignItems="flex-start"
          sx={{ padding: 0 }}
        >
          <ListItemAvatar>
            <UserAvatar 
              user={{ 
                userId: comment.user.userId, 
                profilePictureUrl: comment.user.profilePictureUrl, 
                name: "na" 
              }} 
              userId={""} 
            />
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
      sx={{ marginTop: "0.5rem" }}
      onClick={onLoadMore}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : 'Load More'}
    </Button>
  </>
);

interface CommentSectionProps {
  videoId: string;
}

export default function CommentSection({ videoId }: CommentSectionProps) {
  const { comments, isLoading, error, loadMore, addComment } = useCommentsFetch(videoId);

  if (error) return <Typography color="error">Error loading comments</Typography>;

  return (
    <Box margin="auto">
      <Typography variant="h1" marginTop="0.5rem" fontWeight={500} fontSize="1.2rem">
        Comments
      </Typography>
      <CommentForm videoId={videoId} onCommentAdded={addComment} />
      <CommentList 
        comments={comments} 
        onLoadMore={loadMore} 
        isLoading={isLoading} 
      />
    </Box>
  );
}
