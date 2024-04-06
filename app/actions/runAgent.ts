"use server";
import client from "@/app/libs/openAiClient";
import prisma from "@/app/libs/prismadb";
import { sanitize } from "@/app/libs/sanitize";
import OpenAI from "openai";
import { callbackify } from "util";

interface AgentArgs {
	userInput: string;
	systePrompt: string;
	model: "gpt-3.5-turbo-0125" | "gpt-4";
	conversationLimit: number;
	tools: OpenAI.ChatCompletionTool[];
	availableTools: AvailableTools;
	callback:(input:string) => Promise<any>;
	temprature?: number;
}
/**
 * A function that takes a user's input and a system prompt and runs a conversation with the AI model
 * @param userInput the user's text prompt
 * @param systePrompt the role that system plays, a list of tools availble to the AI and any other information that the AI needs to know
 * @param model the ChatGPT model to use
 * @param conversationLimit the number of iterations to run the conversation
 * @param availableTools an object whose keys are the names of the tools and the values are the functions that the tools call
 * @returns a DiscriminatedMessage object the message is either "success" or "error" and the payload is the data or error message.
 */
export async function agent(input: AgentArgs): Promise<DiscriminatedMessage> {
	const { userInput, systePrompt, model, conversationLimit, tools, availableTools, temprature, callback } = input;
	const messages: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: systePrompt }];
	messages.push({
		role: "user",
		content: userInput,
	});
	console.log("messages:", messages);
	let currentArg = "";
	for (let i = 0; i < conversationLimit; i++) {
		const response = await client.chat.completions.create({
			model,
			temperature: temprature || 0.3,
			messages,
			tools,
		});

		const { finish_reason, message } = response.choices[0];
		console.log("finish_reason:", finish_reason);
		console.log("message:", message);
		if (finish_reason === "tool_calls" && message.tool_calls) {
			console.log("message.tool_calls[0]:", message.tool_calls[0]);
			const functionName = message.tool_calls[0].function.name;
			const functionToCall =
				availableTools[
					functionName as Tool
				];
			const functionArgs = JSON.parse(message.tool_calls[0].function.arguments);
			const functionArgsArr: string[] = Object.values(functionArgs);
			if (functionName === "get_data_from_db" || functionName === "request_data_from_db") {
				currentArg = functionArgsArr[0];
			}
			console.log("going to call ", functionName, " with args ", functionArgsArr);
			console.log("currentArg:", currentArg);
			// @ts-ignore
			const functionResponse: string = await functionToCall.apply(null, functionArgsArr);
			console.log("functionResponse:", functionResponse);
			messages.push({
				role: "function",
				name: functionName,
				content: functionResponse,
			});
		} else if (finish_reason === "stop") {
			messages.push(message);
			try {
				const data = await callback(currentArg)
				const query = currentArg;
				return { message: "success", payload: { data, query } };
			} catch (error: any) {
				return {message: "error", payload: {error: error}};
			}
		}
	}
	return {
		message: "error",
		payload: { error: "The maximum number of iterations has been met without a suitable answer. Please try again with a more specific input" },
	};
}