import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Add from "./board/Add";
import {
	Paper,
	Button,
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
export default function Board() {
	const classes = useStyles();
	const [page, setPage] = useState(0);
	const [open, setOpen] = useState(false);
	const [deleteBtn, setDeleteBtn] = useState(false);

	const [rowsPerPage, setRowsPerPage] = useState(10);
	const data = useFetch(API_SERVER + "/users");
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
	const deleteFunc = () => {
		deleteBtn ? setDeleteBtn(false) : setDeleteBtn(true);
	};
	const headKey = ["ID", "name", "content", "date"];

	return (
		<div className="board-container">
			<div className="board-conponent">
				<Button id="addNew" variant="contained" onClick={handleOpen}>
					New
				</Button>
				<Button
					id="delete"
					className={deleteBtn ? "select" : "delete"}
					variant="contained"
					onClick={deleteFunc}
				>
					{deleteBtn ? "select" : "delete"}
				</Button>
			</div>

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
							{data
								.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
								.map((column) => {
									return (
										<TableRow
											hover
											role="checkbox"
											tabIndex={-1}
											key={column.id}
										>
											{Object.values(column).map((item, i) => {
												return (
													<TableCell key={"key-" + i}>
														{i === 0 && deleteBtn ? (
															<input type="checkbox"></input>
														) : (
															item
														)}
													</TableCell>
												);
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

			<Add open={open} setOpenFunc={setOpen} />
		</div>
	);
}
