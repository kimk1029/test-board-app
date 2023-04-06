import React from "react";
import styled from "styled-components";
import { makeStyles } from "@material-ui/core/styles";
import { Link } from "react-router-dom"; // import Link component
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@material-ui/core";
import { useQuery } from "react-query";
import { fetchJSON } from "../apiService";
interface BoardData {
  uid: number;
  title: string;
  author: string;
  creation_date: string;
}

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
});

const Board: React.FC = () => {
  const classes = useStyles();
  const {
    data: boardData,
    isLoading,
    error,
  } = useQuery<BoardData[], Error>("boardData", () => fetchJSON("/bbs"));
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error fetching board data: {error.message}</div>;
  }

  if (!boardData) {
    return <div>No data available</div>;
  }
  // sort the boardData array in descending order based on the id value
  console.log(boardData);
  boardData.reverse();

  return (
    <div style={{ paddingTop: "100px" }}>
      <TableContainer
        component={Paper}
        style={{ margin: "20px auto", width: "1000px" }}
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
            {boardData.map((item: BoardData) => (
              <TableRow className={classes.tableRow}>
                <TableCell>{item.uid}</TableCell>
                <TableCell>
                  <Link
                    key={item.uid}
                    to={`/board/${item.uid}`}
                  >{`${item.title}`}</Link>
                </TableCell>
                <TableCell>{item.author}</TableCell>
                <TableCell>{item.creation_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Board;
