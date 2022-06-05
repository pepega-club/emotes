import { readdir, writeFile } from "fs/promises";
import { fileTemplate, pageTemplate } from "./common.mjs";

async function main() {
	let files = await readdir("./data/emotes");

	let full = [];
	for (const fileName of files) {
		const [service, id, name] = fileName.split(".")[0].split("-");
		const fileUrl = fileTemplate[service](id);
		const pageUrl = pageTemplate[service](id);

		full.push({
			s: service,
			id,
			n: name,
			fu: fileUrl,
			pu: pageUrl,
			fn: fileName
		});
	}

	await writeFile("./data/index.json", JSON.stringify(files), { encoding: "utf-8" })
	await writeFile("./data/meta.json", JSON.stringify(full), { encoding: "utf-8" })
}

main();
