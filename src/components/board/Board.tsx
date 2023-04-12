import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { Link } from "react-router-dom"; // import Link component
import { useSelector, useDispatch } from "react-redux";
import { fetchBoardData, createPost, BoardData } from "../../store/bbsSlice";
import { AppDispatch, RootState } from "../../store";
import { Button, useMediaQuery } from "@material-ui/core";
import { Pagination } from "@material-ui/lab";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@material-ui/core";
import BoardPostModal from "./BoardPostModal";
const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "calc(77vh - 100px)", // Adjust the height as needed (100px is the paddingTop value)
  },
  table: {
    marginTop: "16px",
  },
  tableRow: {
    "&:hover": {
      cursor: "pointer",
      opacity: "0.6",
    },
  },
  tableHead: {
    backgroundColor: "#f2e6ff",
  },
  titleCell: {
    width: "30%",
  },
  repliesCell: {
    width: "15%",
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  mobileTableContainer: {
    width: "100%",
    overflowX: "auto",
  },
});

const Board: React.FC = () => {
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const isMobile = useMediaQuery("(max-width:690px)");
  const classes = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const boardData = useSelector((state: RootState) => state.bbs.boardData);
  const status = useSelector((state: RootState) => state.bbs.status);
  const error = useSelector((state: RootState) => state.bbs.error);
  const navigate = useNavigate();
  const loggedIn = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

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
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <div style={{ paddingTop: "100px" }}>
      {/* Add this button */}
      {loggedIn && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenModal}
          style={{ marginLeft: "20px" }}
        >
          Create New Post
        </Button>
      )}
      <div className={classes.container}>
        <TableContainer
          component={Paper}
          style={{
            margin: "20px auto",
            width: isMobile ? "100%" : "1000px",
            border: ": 1px solid rgba(0,0,0,0.2);",
          }}
          className={isMobile ? classes.mobileTableContainer : ""}
        >
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Last Post</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reversedBoardData &&
                reversedBoardData
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )
                  .map((item: BoardData, index) => (
                    <TableRow
                      key={"-" + index}
                      className={classes.tableRow}
                      onClick={() => handleRowClick(item.bbs_uid)}
                    >
                      <TableCell>{item.bbs_uid}</TableCell>
                      <TableCell>{`${item.title}`}</TableCell>
                      <TableCell>{item.author}</TableCell>
                      <TableCell>{item.creation_date}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          <Pagination
            count={Math.ceil(reversedBoardData.length / itemsPerPage)}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            style={{
              margin: "16px",
              display: "flex",
              justifyContent: "center",
            }}
          />
        </TableContainer>
      </div>
      <BoardPostModal open={modalOpen} handleClose={handleCloseModal} />
    </div>
  );
};

export default Board;
