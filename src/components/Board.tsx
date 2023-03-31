import React from "react";
import styled from "styled-components";
import { makeStyles } from "@material-ui/core/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@material-ui/core";

interface BoardProps {
  boardData: {
    id: number;
    title: string;
    author: string;
    replies: number;
    views: number;
    lastPost: string;
  }[];
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

const Board: React.FC<BoardProps> = ({ boardData }) => {
  const classes = useStyles();

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
            {boardData.map((item) => (
              <TableRow key={item.id} className={classes.tableRow}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{`${item.title} [${item.replies}]`}</TableCell>
                <TableCell>{item.author}</TableCell>
                <TableCell>{item.lastPost}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Board;
