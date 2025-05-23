import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import "./App.css";
import { alpha, AppBar, Box, IconButton, InputBase, Menu, MenuItem, styled, Toolbar, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { AccountCircle, FileUpload, Logout } from "@mui/icons-material";
import { LogInIcon } from "lucide-react";
import { useAuth } from "../../services/authService";
import UserAvatar from "../UserAvatar";

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: theme.spacing(2),
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(3),
    width: "auto",
  },
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "40ch",
    },
  },
}));

function App() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [searchedTitle, setSearchedTitle] = useState("");

  const handleSearchChange = (event: React.KeyboardEvent<HTMLInputElement> & React.ChangeEvent<HTMLInputElement>) => {
    setSearchedTitle(event.target.value);
    if (event.key === "Enter") {
      setSearchedTitle("");
      navigate("/search?q=" + searchedTitle);
    }
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const logout = () => {
    handleMenuClose();
    auth.logout();
    navigate("/");
  };

  const upload = () => {
    handleMenuClose();
    navigate("/upload");
  };

  const goToProfile = () => {
    handleMenuClose();
    navigate("/profile?userId=" + auth.user?.userId);
  }


  const menuId = "primary-search-account-menu";
  const isMenuOpen = Boolean(anchorEl);
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >

      <MenuItem onClick={upload}><FileUpload sx={{ marginRight: "12px" }} />Upload</MenuItem>
      <MenuItem onClick={logout}><Logout sx={{ marginRight: "12px" }} />Logout</MenuItem>
      <MenuItem onClick={goToProfile}><AccountCircle sx={{ marginRight: "12px" }} />My account</MenuItem>
    </Menu>
  );

  return (
    <>
      
        <AppBar position="sticky">
          <Toolbar
            sx={{
              justifyContent: "space-between",
            }}
          >
            <Link to="/">
              <Typography variant="h6" component="div">
                Sunomi
              </Typography>
            </Link>
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                inputProps={{
                  "aria-label": "search",
                }}
                value={searchedTitle}
                onChange={handleSearchChange}
                onKeyDown={handleSearchChange}
              />
            </Search>
            <div className="actions">
              <IconButton size="large" edge="end" aria-label="account of current user" aria-controls={menuId} aria-haspopup="true" onClick={handleProfileMenuOpen} color="inherit">
                <UserAvatar user={auth.user} userId={null} />
              </IconButton>
            </div>
          </Toolbar>
        </AppBar>
        {renderMenu}
      <Outlet />
    </>
  );
}

export default App;
