import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography } from "@mui/material";
import { useState } from "react";

interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

export default function CommentSection() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: "Alice Johnson",
      content: "Great article! Thanks for sharing.",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      author: "Bob Smith",
      content: "I found this very informative. Looking forward to more content like this.",
      timestamp: "1 hour ago",
    },
  ]);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      const comment: Comment = {
        id: comments.length + 1,
        author: "Current User", // In a real app, this would be the logged-in user
        content: newComment.trim(),
        timestamp: "Just now",
      };
      setComments([...comments, comment]);
      setNewComment("");
    }
  };

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
              <Avatar alt={comment.author} />
            </ListItemAvatar>
            <ListItemText
              primary={
                <>
                  <Typography component="span" variant="subtitle1" color="text.primary">
                    {comment.author}
                  </Typography>
                  {" — "}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {comment.timestamp}
                  </Typography>
                </>
              }
              secondary={comment.content}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
