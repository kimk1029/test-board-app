import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Modal, Fade, Backdrop, TextField } from "@material-ui/core";
import "../assets/css/board/add.scss";
//const API_SERVER = "http://121.133.149.191:3000";
const API_SERVER = "http://localhost:3000";
const useStyles = makeStyles((theme) => ({
	root: {
		width: "100%",
	},
	container: {
		maxHeight: 440,
	},
	modal: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	paper: {
		backgroundColor: theme.palette.background.paper,
		border: "2px solid #000",
		boxShadow: theme.shadows[5],
		padding: theme.spacing(2, 4, 3),
	},
}));
export default function Add(props) {
	const classes = useStyles();
	const [name, setName] = useState("");
	const [contents, setContents] = useState("");
	const handleClose = () => {
		props.setOpenFunc(false);
	};
	console.log(window.scrollY);
	const Insert = () => {
		fetch(API_SERVER + "/users", {
			method: "post",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: name,
				content: contents,
			}),
		}).then(() => {
			handleClose();
		});
	};
	return (
		<Modal
			aria-labelledby="transition-modal-title"
			aria-describedby="transition-modal-description"
			className={classes.modal}
			open={props.open}
			onClose={handleClose}
			closeAfterTransition
			BackdropComponent={Backdrop}
			BackdropProps={{
				timeout: 500,
			}}
		>
			<Fade in={props.open}>
				<div className={classes.paper}>
					<h2 id="transition-modal-title">Transition modal</h2>
					<div id="transition-modal-description">
						react-transition-group animates me.
						<TextField
							id="standard-basic"
							label="글쓴이"
							onChange={(event) => setName(event.target.value)}
						/>
						<TextField
							id="standard-basic"
							label="제목"
							variant="outlined"
							onChange={(event) => setContents(event.target.value)}
						/>
						이름은 : {name}
						<br />
						내용은 : {contents}
					</div>
					<Button
						variant="contained"
						onClick={() => {
							Insert({ name, contents });
						}}
					>
						작성
					</Button>
				</div>
			</Fade>
		</Modal>
	);
}
