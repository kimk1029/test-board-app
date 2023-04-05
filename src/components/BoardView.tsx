import React, { useState } from "react";
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

const CommentSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const NameInput = styled.input`
  width: 100px;
  margin-right: 10px;
`;

const CommentInput = styled.textarea`
  flex: 1;
`;

const BoardView: React.FC = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleCommentSubmit = () => {
    console.log("Name: ", name);
    console.log("Comment: ", comment);
    // Submit the comment to the server
  };

  return (
    <Container>
      <Title>title + {id}</Title>
      <Content>content</Content>
      <Date>Posted on: </Date>
      <CommentSection>
        <NameInput
          type="text"
          placeholder="Name"
          value={name}
          onChange={handleNameChange}
        />
        <CommentInput
          placeholder="Write your comment here..."
          value={comment}
          onChange={handleCommentChange}
        />
        <button onClick={handleCommentSubmit}>Submit</button>
      </CommentSection>
    </Container>
  );
};

export default BoardView;
