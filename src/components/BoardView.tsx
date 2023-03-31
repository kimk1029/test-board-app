import React from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
interface BoardViewProps {
  title: string;
  content: string;
  date: string;
}

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 50px;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const Title = styled.h2`
  font-size: 32px;
  margin-bottom: 20px;
`;

const Content = styled.p`
  font-size: 18px;
  line-height: 1.5;
  margin-bottom: 30px;
`;

const Date = styled.p`
  font-size: 14px;
  color: #666;
`;
const BoardView: React.FC = () => {
  const { id } = useParams();

  return (
    <Container>
      <Title>title + {id}</Title>
      <Content>content</Content>
      <Date>Posted on: Date</Date>
    </Container>
  );
};

export default BoardView;
