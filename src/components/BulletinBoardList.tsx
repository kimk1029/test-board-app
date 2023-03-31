import React from "react";
import styled from "styled-components";
import { Grid, Paper, Typography } from "@material-ui/core";

export interface BoardList {
  title: string;
  author: string;
  date: string;
  content: string;
  id: number;
}
const Container = styled(Grid)`
  margin: 0px;
  display: flex;
  flex-direction: column;
  width: 80vw;
  margin: 100px auto;
`;

const PostNumber = styled(Typography)`
  font-weight: bold;
`;

const PostTitle = styled(Typography)`
  margin-top: 8px;
`;

const PostAuthor = styled(Typography)`
  margin-top: 8px;
`;

const PostDate = styled(Typography)`
  margin-top: 8px;
`;
const BoardList = styled(Paper)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0px;
`;
const BulletinBoardList = ({ data }: any) => {
  return (
    <Container>
      <Grid>
        <BoardList style={{ padding: "16px" }}>
          <PostNumber variant="subtitle1">아이디</PostNumber>
          <PostTitle variant="h6">제목</PostTitle>
          <PostAuthor variant="subtitle2">작성자</PostAuthor>
          <PostDate variant="subtitle2">날짜</PostDate>
        </BoardList>
      </Grid>
      {data.map((item: BoardList) => (
        <Grid key={item.id}>
          <BoardList style={{ padding: "16px" }}>
            <PostNumber variant="subtitle1">{item.id}</PostNumber>
            <PostTitle variant="h6">{item.title}</PostTitle>
            <PostAuthor variant="subtitle2">{item.author}</PostAuthor>
            <PostDate variant="subtitle2">{item.date}</PostDate>
          </BoardList>
        </Grid>
      ))}
    </Container>
  );
};

export default BulletinBoardList;
