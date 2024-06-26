'use server';
import { promises } from "fs";

export default async function saveExampleToDisk(prompt: string, query: string): Promise<string> {
	await promises.appendFile(process.cwd() + "/app/static/exampleQueries.csv", `\n"${prompt}","${query}"`, "utf8");
	return "Example saved to disk.";
}