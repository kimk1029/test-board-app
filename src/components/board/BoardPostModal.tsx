import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@material-ui/core";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // import the styles
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { createPost, fetchBoardData } from "../../store/bbsSlice";
import styled from "styled-components";

interface BoardPostModalProps {
  open: boolean;
  handleClose: () => void;
}
const SQuill = styled(ReactQuill)`
  .ql-editor {
    min-height: 500px;
  }
`;
const BoardPostModal: React.FC<BoardPostModalProps> = ({
  open,
  handleClose,
}) => {
  const [newPostTitle, setNewPostTitle] = React.useState("");
  const [newPostContent, setNewPostContent] = React.useState("");
  const userEmail = useSelector((state: RootState) => state.auth.email);
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPostTitle(e.target.value);
  };

  const handleContentChange = ({ content }: any) => {
    setNewPostContent(content);
  };
  const dispatch = useDispatch<AppDispatch>();
  const handleCreatePost = () => {
    dispatch(
      createPost({
        title: newPostTitle,
        contents: newPostContent,
        author: userEmail,
      })
    ).then(() => {
      dispatch(fetchBoardData());
    });
    setNewPostTitle("");
    setNewPostContent("");
    handleClose();
  };
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Create New Post</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter the title and content for the new post.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="title"
          label="Title"
          type="text"
          fullWidth
          value={newPostTitle}
          onChange={handleTitleChange}
        />
        <SQuill
          theme="snow"
          value={newPostContent}
          onChange={(content, delta, source, editor) =>
            handleContentChange({ content })
          }
          style={{
            marginTop: "16px",
            marginBottom: "8px",
            minHeight: "500px",
            minWidth: "500px",
          }} // Add some margin for better spacing
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleCreatePost} color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BoardPostModal;
