"use client";
import React from "react";

interface ResizableHandleProps {
	isResizing: boolean;
	isVertical?: boolean | null;
	handleMouseDown: (e:React.MouseEvent) => void;
    direction: "left" | "right" | "top" | "bottom";
}

const ResizableHandle: React.FC<ResizableHandleProps> = ({ isResizing, isVertical, handleMouseDown, direction }) => {
	const positionHandleStyle = isVertical ? `h-1 left-0 right-0 bottom-0 cursor-row-resize` : `w-1 top-0 bottom-0 ${direction}-0 cursor-col-resize`;
	return <div className={`absolute ${positionHandleStyle} hover:bg-[#abb2bf] hover:bg-opacity-60 ${isResizing ? "bg-[#abb2bf] bg-opacity-60" : ""}`} onMouseDown={(e) => handleMouseDown(e)} />;
};

export default ResizableHandle;
 