import React from "react";
import { Link } from "react-router-dom";
import "./assets/css/nav.scss";
function nav() {
	return (
		<div className="nav-header">
			<Link to="/home">
				<p>KyuHyeon Kim</p>
			</Link>

			<div>
				<ul className="nav_ul">
					<Link to="/about">
						<li>about</li>
					</Link>
					<Link to="/component_ui">
						<li>comp</li>
					</Link>
					<Link to="/board">
						<li>board</li>
					</Link>
					<Link to="/component_ui">
						<li>contact</li>
					</Link>
				</ul>
			</div>
		</div>
	);
}

export default nav;
