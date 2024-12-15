import { Box, Button, Checkbox, FormControl, FormControlLabel, FormLabel, Link, Stack, styled, TextField, Typography } from "@mui/material";
import { useState } from "react";
import MuiCard from "@mui/material/Card";
import { AuthApi } from "@/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/authService";
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

export default function SignIn() {
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [nameError, setNameError] = useState(false);
  const [nameErrorMessage, setNameErrorMessage] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  const validateInputs = () => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;
    const name = document.getElementById("name") as HTMLInputElement;

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    if (!name.value || name.value.length < 1) {
      setNameError(true);
      setNameErrorMessage("Name is required.");
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (nameError || emailError || passwordError) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    const mail = data.get("email") as string;
    const name = data.get("name") as string;
    const psw = data.get("password") as string;

    const authApi = new AuthApi();
    try {

       await authApi.authSignupPost({
        authSignupPostRequest: {
          userId: mail,
          password: psw,
          name: name,
        },
      });

      
      
      auth.login(name, psw);
      navigate("/");
      
      
    } catch (error){
      enqueueSnackbar(JSON.stringify(error), {variant: 'error'});
    }
  };

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
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <FormControl>
            <FormLabel htmlFor="name">Full name</FormLabel>
            <TextField autoComplete="name" name="name" required fullWidth id="name" placeholder="Jon Snow" error={nameError} helperText={nameErrorMessage} color={nameError ? "error" : "primary"} />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="email">Email</FormLabel>
            <TextField required fullWidth id="email" placeholder="your@email.com" name="email" autoComplete="email" variant="outlined" error={emailError} helperText={emailErrorMessage} color={passwordError ? "error" : "primary"} />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="password">Password</FormLabel>
            <TextField required fullWidth name="password" placeholder="••••••" type="password" id="password" autoComplete="new-password" variant="outlined" error={passwordError} helperText={passwordErrorMessage} color={passwordError ? "error" : "primary"} />
          </FormControl>
          <FormControlLabel control={<Checkbox value="allowExtraEmails" color="primary" />} label="I want to receive updates via email." />
          <Button type="submit" fullWidth variant="contained" onClick={validateInputs}>
            Sign up
          </Button>
          <Typography
            sx={{
              textAlign: "center",
            }}
          >
            Already have an account? <span>
              <Link
                href="login"
                variant="body2"
                sx={{
                  alignSelf: "center",
                }}
              >
                Sign in
              </Link>
            </span>
          </Typography>
        </Box>
      </Card>
    </SignInContainer>
  );
}
