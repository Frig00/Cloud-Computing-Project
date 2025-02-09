import { VideoApi, VideoVideoIdCommentsGet200ResponseCommentsInner } from "@/api";
import { useAuth } from "@/services/authService";
import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography } from "@mui/material";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import UserAvatar from "../UserAvatar";

interface CommentSectionProps {
  videoId: string;
}

const PAGE_SIZE = 5;

export default function CommentSection({ videoId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const auth = useAuth();
  const videoApi = new VideoApi();
  const queryClient = useQueryClient();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ["videoComments", videoId],
    queryFn: ({ pageParam }) => videoApi.videoVideoIdCommentsGet({
      skip: pageParam,
      take: PAGE_SIZE,
      videoId,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.comments.length >= PAGE_SIZE
        ? allPages.length * PAGE_SIZE
        : undefined;
    },
  });

  const comments = data?.pages.flatMap(page => page.comments) ?? [];

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

    addComment(comment);
    setNewComment("");
  };

  const addComment = (comment: VideoVideoIdCommentsGet200ResponseCommentsInner) => {
    queryClient.setQueryData(
      ["videoComments", videoId],
      (old: any) => {
        if (!old) return { pages: [{ comments: [comment] }], pageParams: [0] };
        return {
          ...old,
          pages: [
            { ...old.pages[0], comments: [comment, ...old.pages[0].comments] },
            ...old.pages.slice(1),
          ],
        };
      }
    );
  };

  if (status === 'error') return <Typography color="error">Error loading comments</Typography>;

  return (
    <Box margin="auto">
      <Typography variant="h1" marginTop="0.5rem" fontWeight={500} fontSize="1.2rem">
        Comments
      </Typography>
      
      {/* Comment Form */}
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

      {/* Comment List */}
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
                  name: "",
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
      {hasNextPage && (
      <Button
        variant="outlined"
        color="primary"
        sx={{ marginTop: "0.5rem" }}
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more...'
          : 'Load More'}
      </Button>)}
    </Box>
  );
}
