import { Box, Button, FormControl, FormLabel, Link, Stack, styled, TextField, Typography } from "@mui/material";
import { GitHub as GitHubIcon } from '@mui/icons-material';
import MuiCard from "@mui/material/Card";
import { useAuth } from "../services/authService";
import { useNavigate, useLocation } from "react-router";
import { GITHUB_LOGIN_URL } from "@/lib/consts";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { enqueueSnackbar } from "notistack";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow: "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow: "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const GitHubButton = styled(Button)({
  backgroundColor: '#24292e',
  color: '#ffffff',
  '&:hover': {
    backgroundColor: '#2f363d',
  },
  textTransform: 'none',
  padding: '6px 16px',
  borderRadius: '6px',
});

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage: "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage: "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const validateInputs = async () => {
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);


    try {
      await auth.login(
        data.get("username") as string,
        data.get("password") as string,
      );

      onLoginSuccessful();
    } catch (error) {
      enqueueSnackbar(JSON.stringify(error), {variant: 'error'});
    }
  };

  const onLoginSuccessful = () => {
    const from = (location.state as any)?.from?.pathname || "/";
    navigate(from);
  };

  const onGithubLogin = () => {
    window.location.href = GITHUB_LOGIN_URL;
  };

  useEffect(() => {

    const checkCookies = async () => {
      await auth.loginWithCookie();
      onLoginSuccessful();
    }
    if (searchParams.get("useCookie")) {
      checkCookies();
    };
  }, [])

  if (searchParams.get("useCookie")) return null;

  return (
    <SignInContainer direction="column" justifyContent="space-between">
      <Card variant="outlined">
        <Typography
          component="h1"
          variant="h4"
          sx={{
            width: "100%",
            fontSize: "clamp(2rem, 10vw, 2.15rem)",
          }}
        >
          Sign in
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            gap: 2,
          }}
        >
          <FormControl>
            <FormLabel htmlFor="username">Username</FormLabel>
            <TextField
              id="username"
              type="username"
              name="username"
              placeholder="billionareboy"
              autoComplete="username"
              autoFocus
              required
              fullWidth
              variant="outlined"
              color="primary"
              sx={{
                ariaLabel: "username",
              }}
            />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="password">Password</FormLabel>
            <TextField name="password" placeholder="••••••" type="password" id="password" autoComplete="current-password" autoFocus required fullWidth variant="outlined" color="primary" />
          </FormControl>
          <Stack gap={1}>
            <Button type="submit" fullWidth variant="contained" onClick={validateInputs}>
              Sign in
            </Button>
            <GitHubButton
              variant="contained"
              startIcon={<GitHubIcon />}
              onClick={onGithubLogin}
            >
              Sign in with GitHub
            </GitHubButton>
          </Stack>
          <Typography
            sx={{
              textAlign: "center",
            }}
          >
            Don&apos;t have an account? <span>
              <Link
                href="sign-up"
                variant="body2"
                sx={{
                  alignSelf: "center",
                }}
              >
                Sign up
              </Link>
            </span>
          </Typography>
        </Box>
      </Card>
    </SignInContainer>
  );
}
