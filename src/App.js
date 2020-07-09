import React from "react";
import Nav from "./view/nav";
import Main from "./view/main";
import About from "./view/about";
import Component_ui from "./view/component_ui";
import Board from "./view/board";
import "./App.scss";
import { Route, Switch, BrowserRouter as Router } from "react-router-dom";

function App() {
	return (
		<Router>
			<div className="App">
				<Nav />
				<div className="view_container">
					<Switch>
						<Route exact path="/" component={Main} />
						<Route path="/about" component={About} />
						<Route path="/component_ui" component={Component_ui} />
						<Route path="/board" component={Board} />
					</Switch>
				</div>
			</div>
		</Router>
	);
}
export default App;
