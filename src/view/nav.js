import React from "react";
import { Link } from "react-router-dom";
function nav() {
	return (
		<div className="nav-header">
			<p>home2</p>
			<div>
				<ul className="nav_ul">
					<Link to="/about">
						<li>about</li>
					</Link>
					<Link to="/component_ui">
						<li>comp</li>
					</Link>
				</ul>
			</div>
		</div>
	);
}

export default nav;
