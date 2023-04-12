import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { deletePost, fetchBoardDetails } from "../..//store/bbsSlice";
import styled from "styled-components";
import { TextField, Button, Grid, Box } from "@material-ui/core"; // Import Material-UI components

interface BoardViewProps {
  title: string;
  content: string;
  date: string;
}

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 50px;
  padding-top: 100px; // Add top padding
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
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const boardDetails = useSelector(
    (state: RootState) => state.bbs.boardDetails
  );
  const userEmail = useSelector((state: RootState) => state.auth.email);
  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      dispatch(deletePost(Number(id)));
      navigate("/board");
    }
  };
  useEffect(() => {
    dispatch(fetchBoardDetails(Number(id)));
  }, [id, dispatch]);

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

  if (!boardDetails) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      {userEmail === boardDetails.author && (
        <Button
          variant="contained"
          color="secondary"
          onClick={handleDeletePost}
        >
          Delete Post
        </Button>
      )}
      {/* ... existing JSX */}
      <Title>{boardDetails.title}</Title>
      <Content dangerouslySetInnerHTML={{ __html: boardDetails.contents }} />
      <Date>Posted on: {boardDetails.creation_date}</Date>
      <Box my={4}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Name"
              placeholder="Name"
              value={name}
              onChange={handleNameChange}
            />
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Write your comment here..."
              placeholder="Write your comment here..."
              value={comment}
              onChange={handleCommentChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCommentSubmit}
            >
              Submit
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default BoardView;
