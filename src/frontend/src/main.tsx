import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";
import App from "./components/App/App.tsx";
import ErrorPage from "./components/ErrorPage.tsx";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Login from "./components/Login.tsx";
import SignUp from "./components/SignUp.tsx";
import Watch from "./components/Watch/Watch.tsx";
import Upload from "./components/Upload/Upload.tsx";
import Search from "./components/Search.tsx";
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./services/authService.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { Configuration, DefaultConfig } from "./api/runtime.ts";
import HomePage from "./components/HomePage.tsx";
import "@fontsource/geist-sans/100.css";
import "@fontsource/geist-sans/200.css";
import "@fontsource/geist-sans/300.css";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-sans/800.css";
import "@fontsource/geist-sans/900.css";
import Profile from "./components/Profile.tsx";
import configService, { getApiUrl } from "./services/configService.tsx";
import ConfigService from "./services/configService.tsx";






async function initializeApp() {
  try {

    await ConfigService.getInstance().init();

    DefaultConfig.config = new Configuration({
      basePath: getApiUrl(),
    });

    const theme = createTheme({
      typography: {
        fontFamily: "'Geist Sans', sans-serif",
      },
      palette: {
        mode: "light",
        primary: {
          main: "#a27767",
          contrastText: "#554440",

        },
        background: {
          default: "#f1efe4", // Custom Background Color
          paper: "#f1efe4",
        },
      },
    });
    
    const queryClient = new QueryClient();

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter >
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/sign-up" element={<SignUp />} />
                    <Route path="/" element={<App />} errorElement={<ErrorPage />}>
                      <Route element={<ProtectedRoute />}>
                        <Route index element={<HomePage />} />
                        <Route path="watch" element={<Watch />} />
                        <Route path="upload" element={<Upload />} />
                        <Route path="search" element={<Search />} />
                        <Route path="profile" element={<Profile />} />
                      </Route>
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ThemeProvider>
            </QueryClientProvider>
          </AuthProvider>
        </SnackbarProvider>
      </StrictMode>
    );
  } catch (error) {
    console.error("Failed to initialize app", error);
    createRoot(document.getElementById('root')!).render(
      <div>Failed to load application configuration</div>
    );
  }
}

initializeApp()