import { Avatar, Box, Typography } from "@mui/material";
import { AuthLoginPost200ResponseUser } from "@/api";


interface UserAvatarProps {
    user: AuthLoginPost200ResponseUser | null;
    userId: string | null;
 }


export default function UserAvatar({ user, userId}: UserAvatarProps) {
    const firstLetters = (name: string)  => {
        const names = name.split(" ");
        return names.map((n) => n[0]).join("").toUpperCase();
      };
    
      

      return (

        <Box display="flex" alignItems="center">
        {!user ? (
          <Avatar
            sx={{
              width: 100,
              height: 100,
              marginBottom: 2,
              marginTop: 2,
            }}
          />
        ) : user.profilePictureUrl ? (
          <Avatar src={user.profilePictureUrl ?? undefined} />
        ) : (
          <Avatar>{firstLetters(user.name ?? "A")}</Avatar>
        )}
        {userId && (
        <Typography variant="body1" marginLeft={2} fontWeight="bold">
          {userId}
        </Typography>)}
      </Box>
        
       
      );
};