import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { Link } from "react-router-dom"; // import Link component
import { useSelector, useDispatch } from "react-redux";
import { fetchBoardData, createPost } from "../store/bbsSlice";
import { AppDispatch, RootState } from "../store";
import {
  // ...
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@material-ui/core";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@material-ui/core";
const useStyles = makeStyles({
  table: {
    minWidth: 650,
    marginTop: "16px", // add some top margin
  },
  tableRow: {
    "&:hover": {
      cursor: "pointer",
      opacity: "0.6",
    },
  },
  tableHead: {
    backgroundColor: "#f2e6ff", // add a pastel color
  },
  titleCell: {
    width: "30%", // make title cell wider
  },
  repliesCell: {
    width: "15%", // make replies cell narrower
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
});

const Board: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newPostTitle, setNewPostTitle] = React.useState("");
  const [newPostContent, setNewPostContent] = React.useState("");
  const classes = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const boardData = useSelector((state: RootState) => state.bbs.boardData);
  const status = useSelector((state: RootState) => state.bbs.status);
  const error = useSelector((state: RootState) => state.bbs.error);
  const navigate = useNavigate();

  const handleRowClick = (id: number) => {
    navigate(`/board/${id}`);
  };

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchBoardData());
    }
  }, [status, dispatch]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "failed") {
    return <div>Error fetching board data: {error}</div>;
  }

  if (!boardData) {
    return <div>No data available</div>;
  }

  const reversedBoardData = [...boardData].reverse();
  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPostTitle(e.target.value);
  };

  const handleContentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    setNewPostContent(e.target.value);
  };
  const handleCreatePost = () => {
    dispatch(createPost({ title: newPostTitle, content: newPostContent }));
    setNewPostTitle("");
    setNewPostContent("");
    setModalOpen(false);
  };
  return (
    <div style={{ paddingTop: "100px" }}>
      {/* Add this button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenModal}
        style={{ marginLeft: "20px" }}
      >
        Create New Post
      </Button>
      {/* ... (existing table code) */}
      {/* Add this modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
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
          <TextField
            margin="dense"
            id="content"
            label="Content"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={newPostContent}
            onChange={handleContentChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreatePost} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Board;
