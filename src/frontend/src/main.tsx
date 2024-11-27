import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import Upload from "./Upload.tsx";
import Search from "./Search.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./services/authService.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import Bench from "./Bench.tsx";
import { Configuration, DefaultConfig } from "./api/runtime.ts";


DefaultConfig.config = new Configuration({basePath: "http://localhost:3000"});

const theme = createTheme({
  typography: {
    fontFamily: "Inter, Arial, sans-serif",
  },
});

const HomePage = () => (
  <Container maxWidth="xl">
    <div className="flex gap-2 flex-wrap m-2">
      <VideoThumbnail src="" alt="" variant="small" />
      <VideoThumbnail src="" alt="" variant="small" />
      <VideoThumbnail src="" alt="" variant="small" />
      <VideoThumbnail src="" alt="" variant="small" />
    </div>
  </Container>
);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StrictMode>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter basename="/cloudwatch-web">
            <Routes>
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/bench" element={<Bench />} />
              <Route path="/" element={<App />} errorElement={<ErrorPage />}>
                <Route element={<ProtectedRoute />}>
                  <Route index element={<HomePage />} />
                  <Route path="watch" element={<Watch />} />
                  <Route path="upload" element={<Upload />} />
                  <Route path="search" element={<Search />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </StrictMode>
    </AuthProvider>
  </QueryClientProvider>,
);
