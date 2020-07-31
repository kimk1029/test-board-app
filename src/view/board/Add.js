import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, Modal, Fade, Backdrop, TextField } from "@material-ui/core";
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
</Modal>;
