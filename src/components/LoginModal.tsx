import React, { useState } from "react";
import styled from "styled-components";
import { Button, TextField, Modal, Box, Typography } from "@material-ui/core";
import { Link } from "react-router-dom";
import { useQueryClient } from "react-query";
import { fetchJSON } from "../apiService";
const API = "http://112.169.230.149:8000";
const StyledModal = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBox = styled(Box)`
  background-color: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 400px;
`;

const Title = styled(Typography)`
  font-weight: bold;
  margin-bottom: 16px;
`;

const TextFieldContainer = styled(Box)`
  margin-top: 16px;
  margin-bottom: 16px;
`;

const LoginButtonContainer = styled(Box)`
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
`;

const LoginButton = styled(Button)`
  margin-right: 8px;
  background-color: #4caf50;
  color: #fff;

  &:hover {
    background-color: #357a38;
  }
`;

const CloseButton = styled(Button)`
  background-color: #f44336;
  color: #fff;

  &:hover {
    background-color: #d32f2f;
  }
`;

const SignUpButton = styled(Button)`
  background-color: #2196f3;
  color: #fff;
  margin-right: 8px;

  &:hover {
    background-color: #1976d2;
  }
`;

const SignUpModalBox = styled(ModalBox)`
  height: 450px;
`;

const SignUpModalTitle = styled(Title)`
  margin-top: 24px;
`;
const LoginModal = ({ open, onClose }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const queryClient = useQueryClient();
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };
  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };
  const handleLogin = async () => {
    try {
      const data = await fetchJSON("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      // Store the token in local storage with expiration time
      const expiresIn = 60 * 60 * 1000; // 1 hour in milliseconds
      const expirationTime = new Date().getTime() + expiresIn;
      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenExpiration", expirationTime.toString());
      // Save the token and email information in the react-query store state
      queryClient.setQueryData("token", data.token);
      queryClient.setQueryData("email", email);
      // Close the LoginModal component
      handleClose();
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const handleSignUp = () => {
    setIsSignUp(true);
  };
  const handleSignUpSubmit = async () => {
    try {
      const data = await fetchJSON("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
          nickname: nickname,
        }),
      });

      // handle successful registration here (e.g., show a success message or redirect the user)
      handleClose();
    } catch (error) {
      console.error("Error during registration:", error);
    }
  };

  const handleClose = () => {
    onClose(false);
    setIsSignUp(false);
  };

  return (
    <StyledModal
      open={open}
      onClose={(event, reason) => {
        handleClose();
      }}
    >
      <ModalBox>
        {isSignUp ? (
          <Title variant="h5">Register</Title>
        ) : (
          <Title variant="h5">Login</Title>
        )}
        <TextFieldContainer>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={handleEmailChange}
          />
        </TextFieldContainer>
        <TextFieldContainer>
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={handlePasswordChange}
          />
        </TextFieldContainer>
        {isSignUp && (
          <TextFieldContainer>
            <TextField
              label="Nickname"
              variant="outlined"
              fullWidth
              value={nickname}
              onChange={handleNicknameChange}
            />
          </TextFieldContainer>
        )}
        <LoginButtonContainer>
          {isSignUp ? (
            <LoginButton variant="contained" onClick={handleSignUpSubmit}>
              Register
            </LoginButton>
          ) : (
            <LoginButton variant="contained" onClick={handleLogin}>
              Login
            </LoginButton>
          )}
          <CloseButton variant="contained" onClick={handleClose}>
            Close
          </CloseButton>
        </LoginButtonContainer>
        {isSignUp ? (
          <TextFieldContainer>
            <Typography variant="body2">
              Already have an account?{" "}
              <Link onClick={() => setIsSignUp(false)} to={""}>
                Login
              </Link>
            </Typography>
          </TextFieldContainer>
        ) : (
          <TextFieldContainer>
            <Typography variant="body2">
              Don't have an account?{" "}
              <Link onClick={() => setIsSignUp(true)} to={""}>
                Register
              </Link>
            </Typography>
          </TextFieldContainer>
        )}
      </ModalBox>
    </StyledModal>
  );
};
export default LoginModal;
