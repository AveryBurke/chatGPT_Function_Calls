"use client";
import { MdOutlineSimCardDownload } from "react-icons/md";
import React, { useEffect, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
interface SheetProps {
	data: any[];
}
/**
 * an editable spreadsheet component.
 * This component uses the Tabulator library to render a spreadsheet.
 * TO DO:  create
 */
const Sheet: React.FC<SheetProps> = ({ data }) => {
	const ref = useRef<any>(null);
	const refTable = useRef<Tabulator | null>(null);
	const handleDownload = () => {
		if (refTable.current) {
			refTable.current.download("xlsx", "data.xlsx", { sheetName: "My Data" });
		}
	};

	useEffect(() => {
		if (ref.current) {
			const table = new Tabulator(ref.current, {
				height: "311px",

				spreadsheet: true,
				spreadsheetRows: 50,
				spreadsheetColumns: 50,
				spreadsheetColumnDefinition: { editor: "input", resizable: "header" },
				//@ts-ignore
				spreadsheetData: data,
				// spreadsheetSheetTabs: true,

				rowHeader: { field: "_id", hozAlign: "center", headerSort: false, frozen: true },

				editTriggerEvent: "dblclick", //change edit trigger mode to make cell navigation smoother
				editorEmptyValue: undefined, //ensure empty values are set to undefined so they arent included in spreadsheet output data

				//enable range selection
				selectableRange: 1,
				selectableRangeColumns: true,
				selectableRangeRows: true,
				selectableRangeClearCells: true,

				//configure clipboard to allow copy and paste of range format data
				clipboard: true,
				clipboardCopyStyled: false,
				clipboardCopyConfig: {
					rowHeaders: false,
					columnHeaders: false,
				},
				clipboardCopyRowRange: "range",
				clipboardPasteParser: "range",
				clipboardPasteAction: "range",
			});
			// table.setData(data);
			refTable.current = table;
		}
	}, [data]);
	return (
		<div>
			<div className="p-2">
				<div ref={ref} className="spreadsheet"></div>
			</div>
			<button onClick={handleDownload} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center">
				<MdOutlineSimCardDownload className="w-4 h-4m-r"/>
				download
			</button>
		</div>
	);
};

export default Sheet;