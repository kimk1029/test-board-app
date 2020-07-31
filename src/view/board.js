import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
	Paper,
	Button,
	Modal,
	Fade,
	Backdrop,
	TextField,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
} from "@material-ui/core";
import "./assets/css/board.scss";
import { useFetch } from "../hook/useFetch";
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
export default function Board() {
	const classes = useStyles();
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [open, setOpen] = useState(false);
	const [contents, setContents] = useState("");
	const [name, setName] = useState("");
	const [data, loading] = useFetch(API_SERVER + "/users");

	const handleChangePage = (event, newPage) => {
		setPage(newPage);
	};
	const handleChangeRowsPerPage = (event) => {
		setRowsPerPage(+event.target.value);
		setPage(0);
	};
	const handleOpen = () => {
		setOpen(true);
	};
	const handleClose = () => {
		setOpen(false);
	};
	const Add = ({ name, contents }) => {
		const insert = () => {
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
		insert();
	};
	const headKey = ["ID", "name", "content", "date"];

	return (
		<div className="board-container">
			<Paper className={classes.root} id="board-contents">
				<TableContainer className={classes.container}>
					<Table stickyHeader aria-label="sticky table">
						<TableHead>
							<TableRow>
								{headKey.map((column, i) => (
									<TableCell key={i}>{column}</TableCell>
								))}
							</TableRow>
						</TableHead>
						<TableBody>
							{data.map((column) => {
								return (
									<TableRow hover role="checkbox" tabIndex={-1} key={column.id}>
										{Object.values(column).map((item, i) => {
											return <TableCell key={"key-" + i}>{item}</TableCell>;
										})}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					rowsPerPageOptions={[10, 25, 100]}
					component="div"
					count={data.length}
					rowsPerPage={rowsPerPage}
					page={page}
					onChangePage={handleChangePage}
					onChangeRowsPerPage={handleChangeRowsPerPage}
				/>
			</Paper>
			<Button variant="contained" onClick={handleOpen}>
				Default
			</Button>

			<Modal
				aria-labelledby="transition-modal-title"
				aria-describedby="transition-modal-description"
				className={classes.modal}
				open={open}
				onClose={handleClose}
				closeAfterTransition
				BackdropComponent={Backdrop}
				BackdropProps={{
					timeout: 500,
				}}
			>
				<Fade in={open}>
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
								Add({ name, contents });
							}}
						>
							작성
						</Button>
					</div>
				</Fade>
			</Modal>
		</div>
	);
}
