"use client";
import React from "react";
import useTooltip from "../hooks/useTooltip";

const TooltipComponent: React.FC = () => {
	const {
		coords: { x, y },
		header,
		body,
		isOpen,
		alignment
	} = useTooltip();

	let placementStyles = "transform";
	switch (alignment?.x) {
		case "center":
			placementStyles += " translate-x-1/2";
			break;
		case "right":
			placementStyles += "";
			break;
		default:
			placementStyles += "";
	
	}
	switch (alignment?.y) {
		case "center":
			placementStyles += " -translate-y-1/2";
			break;
		case "top":
			placementStyles += " -translate-y-full";
			break;
		case "bottom":
			placementStyles += "";
			break;
		default:
			placementStyles += "";
	}

	return (
		<div
			className={`absolute p-2 bg-slate-50 text-slate-800 border border-gray-300 rounded-md shadow-md z-50 ` + placementStyles}
			style={{ top: y, left: x, display: isOpen ? "flex" : "none", flexDirection: "column" }}>
			<h3 className="font-bold text-center">{header}</h3>
			{body.length > 0 && <hr className="my-2" />}
			{body.map((line, index) => (
				<span key={index} className="text-sm text-slate-600">
					{line}
				</span>
			))}
		</div>
	);
};

export default TooltipComponent;
