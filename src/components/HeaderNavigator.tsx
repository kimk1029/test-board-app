import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import logo from "../assets/logo.png";
import LoginModal from "./LoginModal";
import { logout, updateAuth } from "../store/authSlice";
import jwt_decode, { JwtPayload } from "jwt-decode";
interface HeaderStyle {
  isScrolled: boolean;
}
interface DropdownMenuProps {
  isOpen: boolean;
}
interface DecodedToken {
  email: string;
  exp: number;
  iat: number;
  // add other claims here if necessary
}
const Container = styled.div<HeaderStyle>`
  display: flex;
  align-items: center;
  height: 64px;
  background-color: ${({ isScrolled }) =>
    isScrolled ? "transparent" : "#fff"};
  box-shadow: ${({ isScrolled }) =>
    isScrolled ? "none" : "0px 2px 4px rgba(0, 0, 0, 0.1)"};
  padding: 0 16px;
  font-family: "Open Sans", sans-serif; /* apply custom font */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  transition: all 0.3s ease-in-out;
`;

const Logo = styled.img`
  height: 40px;
  margin-right: 16px;
`;

const Navigation = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto; /* added */
`;

const NavigationItem = styled(Link)`
  margin-right: 16px;
  cursor: pointer;
  color: #333; /* set default color */
  text-decoration: none; /* remove underline */
  font-weight: bold;
  font-size: 16px;
  &:visited {
    color: #333; /* set visited color */
  }
`;

const LoginButton = styled.button`
  height: 36px;
  width: 100px;
  background-color: #2196f3;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 16px;
  font-family: "Open Sans", sans-serif; /* apply custom font */
`;

const DropdownMenu = styled.div<DropdownMenuProps>`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #ffffff;
  min-width: 150px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  z-index: 1;
  border-radius: 4px;
  display: ${({ isOpen }) => (isOpen ? "block" : "none")};
`;

const DropdownItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  &:hover {
    background-color: #f1f1f1;
  }
`;

const EmailContainer = styled.div`
  position: relative;
`;

const HeaderNavigator = () => {
  const [isVisibleLogin, setIsVisibleLogin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dispatch = useDispatch();
  const storedEmail = useSelector(
    (state: { auth: { email: string | null } }) => state.auth.email
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("token");
    const tokenExpiration = localStorage.getItem("tokenExpiration");

    if (token && tokenExpiration) {
      const currentTime = new Date().getTime();
      const expirationTime = parseInt(tokenExpiration);

      if (currentTime < expirationTime) {
        const decodedToken = jwt_decode<DecodedToken>(token);
        const userEmail = decodedToken.email;

        if (userEmail && userEmail !== storedEmail) {
          dispatch(updateAuth({ user: { email: userEmail }, token: token })); // updateEmail action from the authSlice
        }
      } else {
        // Token has expired, clear it from local storage
        localStorage.removeItem("token");
        localStorage.removeItem("tokenExpiration");
      }
    }
  }, [storedEmail, dispatch]);
  const handleLogout = () => {
    dispatch(logout());
    setIsDropdownOpen(false);
  };

  return (
    <Container isScrolled={isScrolled}>
      <Logo src={logo} alt="Logo" />
      <Navigation>
        <NavigationItem to="/">Home</NavigationItem>
        <NavigationItem to="/board">Board</NavigationItem>
        <NavigationItem to="/contact">Contact</NavigationItem>
      </Navigation>
      {storedEmail ? (
        <EmailContainer>
          <span onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            {storedEmail}
          </span>
          <DropdownMenu isOpen={isDropdownOpen}>
            <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
          </DropdownMenu>
        </EmailContainer>
      ) : (
        <LoginButton onClick={() => setIsVisibleLogin(true)}>Login</LoginButton>
      )}
      <LoginModal open={isVisibleLogin} onClose={setIsVisibleLogin} />
    </Container>
  );
};

export default HeaderNavigator;
