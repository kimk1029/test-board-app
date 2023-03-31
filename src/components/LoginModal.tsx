import React, { useState } from "react";
import styled from "styled-components";
import { Button, TextField, Modal, Box, Typography } from "@material-ui/core";

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
const LoginModal = ({ open, onClose }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleLogin = () => {
    // handle login logic here
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <StyledModal
      open={open}
      onClose={(event, reason) => {
        handleClose();
      }}
    >
      <ModalBox>
        <Title variant="h5">Login</Title>
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
        <LoginButtonContainer>
          <LoginButton variant="contained" onClick={handleLogin}>
            Login
          </LoginButton>
          <CloseButton variant="contained" onClick={handleClose}>
            Close
          </CloseButton>
        </LoginButtonContainer>
      </ModalBox>
    </StyledModal>
  );
};
export default LoginModal;
