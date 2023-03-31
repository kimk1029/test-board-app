import React from "react";
import styled from "styled-components";

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
`;

const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
`;

const Text = styled.h1`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
`;

const HomeScreen = () => {
  return (
    <Container>
      <VideoBackground autoPlay muted loop>
        <source
          src="https://www.youtube.com/embed/Q94k7bilHO0?autoplay=1&loop=1&mute=1"
          type="video/mp4"
        />
      </VideoBackground>
      <Overlay />
      <Text>Welcome</Text>
    </Container>
  );
};

export default HomeScreen;
