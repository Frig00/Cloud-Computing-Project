import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";

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
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

function DemoBadge() {
  const [open, setOpen] = useState(false);
  if (!isDemoMode) return null;
  return (
    <>
      <Chip
        label="This app is in demo mode!"
        color="warning"
        size="small"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1100 }}
      />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Demo Mode</DialogTitle>
        <DialogContent>
          <Typography>
            This application is running in demo mode with no backend available and limited functionality.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function initializeApp() {
  try {

    await ConfigService.getInstance().init();

    DefaultConfig.config = new Configuration({
      basePath: getApiUrl(),
    });

    const theme = createTheme({
      typography: {
        fontFamily: "'Geist Sans', sans-serif",
      }
    });
    
    const queryClient = new QueryClient();

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <DemoBadge />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <HashRouter>
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
                </HashRouter>
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