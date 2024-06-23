"use client";
import Menu from "./Menu";
import MenuItem from "./MenuItem";
import useTooltipSettingsModal from "@/app/hooks/useTooltipSettingsModal";

import React from "react";

const SettingsMenu = () => {
	const tooltipSettingsModal = useTooltipSettingsModal();
	return (
		<Menu title="Settings">
			<MenuItem label="Tooltip" callback={() => tooltipSettingsModal.onOpen()} />
			<MenuItem label="Theme" callback={() => console.log("clicked theme")} />

		</Menu>
	);
};

export default SettingsMenu;
