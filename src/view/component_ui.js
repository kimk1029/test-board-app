import React, { useState } from "react";
import {
	Slider,
	TextField,
	Typography,
	Grid,
	makeStyles,
} from "@material-ui/core";
import { VolumeDown, VolumeUp } from "@material-ui/icons";

const useStyles = makeStyles({
	root: {
		width: "50%",
	},
});

export default function ContinuousSlider() {
	const classes = useStyles();
	const [value, setValue] = useState(0);

	const handleChange = (event, newValue) => {
		setValue(newValue);
	};

	return (
		<div className={classes.root}>
			<Typography id="continuous-slider" gutterBottom>
				Volume
			</Typography>
			<TextField id="outlined-basic" label="outlined" value={value} />
			<Grid container spacing={4}>
				<Grid item>
					<VolumeDown />
				</Grid>
				<Grid item xs>
					<Slider
						value={value}
						onChange={handleChange}
						aria-labelledby="continuous-slider"
					/>
				</Grid>
				<Grid item>
					<VolumeUp />
				</Grid>
			</Grid>
		</div>
	);
}
