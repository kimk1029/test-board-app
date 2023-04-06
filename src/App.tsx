import React from "react";
import logo from "./logo.svg";
import { Route, Link, Routes, BrowserRouter as Router } from "react-router-dom";
import "./App.css";
import HeaderNavigator from "./components/HeaderNavigator";
import BulletinBoardList from "./components/BulletinBoardList";
import HomeScreen from "./components/HomeScreen";
import Board from "./components/Board";
import BoardView from "./components/BoardView";

function App() {
  const boardData = [
    {
      id: 1,
      title: "Example Thread 1",
      author: "User 1",
      replies: 2,
      views: 10,
      lastPost: "1 day ago",
    },
    {
      id: 2,
      title: "Example Thread 2",
      author: "User 2",
      replies: 10,
      views: 20,
      lastPost: "2 days ago",
    },
    {
      id: 3,
      title: "Example Thread 2",
      author: "User 2",
      replies: 10,
      views: 20,
      lastPost: "2 days ago",
    },
    // Add more items here...
  ];
  return (
    <Router>
      <div className="App">
        <HeaderNavigator />
        <Routes>
          <Route path="/" element={<HomeScreen />}></Route>
          <Route path="/board" element={<Board />} />
          <Route path="/board/:id" element={<BoardView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
