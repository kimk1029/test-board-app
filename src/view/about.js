import React from "react";
const element = () => {
	const number = 5;
	for (let i = 0; i < number; i++) {
		return <div class={number}> number</div>;
	}
};
function about() {
	return (
		<div className="App-about">
			<p>about</p>
			<div className="contents">
				<div>{element}</div>
			</div>
		</div>
	);
}

export default about;
