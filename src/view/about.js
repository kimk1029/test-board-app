import React from "react";
import "./assets/css/about.scss";

function about() {
	console.log(22);
	return (
		<div className="App-about">
			<p>about?</p>
			<div className="contents">
				<span className="age">age : 1989</span>
				<div>direction : Seoul, seocho-gu</div>
				<div>job : web dev</div>
			</div>
		</div>
	);
}

export default about;
