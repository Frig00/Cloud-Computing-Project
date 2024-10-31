import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import App from "./App.tsx";
import ErrorPage from "./ErrorPage.tsx";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import VideoThumbnail from "./components/VideoThumbnail.tsx";
import { Box, Container } from "@mui/material";
import SignIn from "./SignIn.tsx";
import SignUp from "./SignUp.tsx";
import Watch from "./Watch.tsx";

const theme = createTheme({
  typography: {
    fontFamily: "Inter, Arial, sans-serif",
  },
});
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: (
          <>
            <Container maxWidth="xl">
              <div className="flex gap-2 flex-wrap m-2">
                <VideoThumbnail src="" alt="" />
                <VideoThumbnail src="" alt="" />
                <VideoThumbnail src="" alt="" />
                <VideoThumbnail src="" alt="" />
              </div>
            </Container>
          </>
        ),
      },
      {
        path: "/watch",
        element: <Watch/>,
      }
    ],
  },
  {
    path: "/sign-in",
    element: <SignIn />,
  },
  {
    path: "/sign-up",
    element: <SignUp />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
