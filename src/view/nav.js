import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./assets/css/nav.scss";
function Nav() {
	const [scrollTopFlag, setScrollTop] = useState(false);
	window.onscroll = () => {
		if (document.documentElement.scrollTop > 0) {
			setScrollTop(true);
		} else {
			setScrollTop(false);
		}
	};
	return (
		<div className={"nav-header " + (scrollTopFlag ? "scrollTop" : "scroll")}>
			<Link to="/">
				<p>TEAST</p>
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

export default Nav;
