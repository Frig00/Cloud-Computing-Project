import { Container, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Watch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoId = searchParams.get("v");

  useEffect(() => {
    // Redirect if the "myParam" query parameter is missing
    if (!videoId) {
      navigate("/", { replace: true }); // Redirect to the home page or any other fallback route
    }
  }, [videoId, navigate]);

  if (!videoId) {
    // Optionally return null or a loading indicator while redirecting
    return null;
  }

  return (
    <Container maxWidth="xl">
      <Stack>
        <img className="mt-4" src="https://picsum.photos/1920/1080"/>
        <Typography variant="h4" className="mt-4">{"{videoTitle}"}</Typography>
        <Typography variant="body1" className="mt-2">{"{description}"}</Typography>
      </Stack>
    </Container>
  );
}
