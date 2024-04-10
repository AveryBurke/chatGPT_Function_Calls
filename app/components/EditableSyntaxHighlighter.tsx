"use client";
import React, { useRef, useState } from "react";
import useAccordion from "../hooks/useAccordion";
import SyntaxHighlighter from "react-syntax-highlighter";
import * as themes from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from 'sql-formatter';

interface EditableSyntaxHighlighterProps {
	theme?: keyof typeof themes;
	initialCode: string;
}

/**
 * An editable syntax highlighter component.
 * This component hides an invisible text area in front of a react-syntax-highlighter component.
 */
const EditableSyntaxHighlighter: React.FC<EditableSyntaxHighlighterProps> = ({ initialCode, theme }) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const accordion = useAccordion();
    const frommatedCode = format(initialCode,{
        language:"postgresql"
    });
	const [code, setCode] = useState(frommatedCode);
	return (
		<div
			role="button"
			tabIndex={0}
			onKeyDown={() => textareaRef.current?.focus()}
			onClick={() => textareaRef.current?.focus()}
			className={"mb-2 relative grid bg-[#282a36] duration-300 ease-in-out " + (accordion.isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
			<div className="overflow-hidden">
				<textarea
					className={
						"gird absolute inset-0 resize-none bg-transparent p-2 font-mono text-transparent caret-white outline-none transition-all duration-300 ease-in-out "
						+ (accordion.isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
					}
					ref={textareaRef}
					value={code}
					onChange={() => setCode(textareaRef.current?.value || "")}
				/>
				<SyntaxHighlighter
                    className={"grid transition-all duration-300 ease-in-out " + (accordion.isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
					language="sql"
					style={themes.atomOneDark}
					customStyle={{
						flex: "1",
						background: "transparent",
					}}>
					{code}
				</SyntaxHighlighter>
			</div>
		</div>
	);
};

export default EditableSyntaxHighlighter;
