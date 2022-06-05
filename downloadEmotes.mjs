import { createWriteStream } from "fs";
import { writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import { fileTemplate } from "./common.mjs";

const contentTypeMapping = {
	"image/png": "png",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/webp": "webp",
}

async function downloadFile(url, path, detectExtension = true) {
	const res = await fetch(url);

	if (detectExtension) {
		const contentType = res.headers.get("Content-Type");

		path = `${path}.${contentTypeMapping[contentType]}`;
	}

	return pipeline(res.body, createWriteStream(path));
}

async function sevenTvFetch(query, page) {
	const res = await fetch("https://api.7tv.app/v2/gql", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-site",
			Pragma: "no-cache",
			"Cache-Control": "no-cache",
		},
		body: JSON.stringify({
			query: "query($query: String!,$page: Int,$pageSize: Int,$globalState: String,$sortBy: String,$sortOrder: Int,$channel: String,$submitted_by: String,$filter: EmoteFilter) {search_emotes(query: $query,limit: $pageSize,page: $page,pageSize: $pageSize,globalState: $globalState,sortBy: $sortBy,sortOrder: $sortOrder,channel: $channel,submitted_by: $submitted_by,filter: $filter) {id,visibility,owner {id,display_name,role {id,name,color},banned}name,tags}}",
			variables: {
				query,
				page,
				pageSize: 150,
				limit: 150,
				globalState: null,
				sortBy: "popularity",
				sortOrder: 0,
				channel: null,
				submitted_by: null,
			},
		}),
	});
	const json = await res.json();
	const totalEmotes = Number(res.headers.get("x-collection-size"));
	return {
		totalEmotes,
		totalPages: Math.ceil(totalEmotes / 150),
		emotes: json.data.search_emotes.map((e) => ({ id: "seventv-" + e.id, name: e.name, url: fileTemplate.seventv(e.id) })),
	};
}

async function frankerFaceZFetch(query, page) {
	const res = await fetch(
		`https://api.frankerfacez.com/v1/emotes?q=${encodeURIComponent(query)}&sensitive=false&page=${page}&per_page=200`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Sec-Fetch-Dest": "empty",
				"Sec-Fetch-Mode": "cors",
				"Sec-Fetch-Site": "cross-site",
				Pragma: "no-cache",
				"Cache-Control": "no-cache",
			},
		}
	);
	const json = await res.json();
	return {
		totalEmotes: json._total,
		totalPages: json._pages,
		emotes: json.emoticons.map((e) => ({ id: "ffz-" + e.id, name: e.name, url: fileTemplate.ffz(e.id) })),
	};
}

// async function betterTTVFetch(query, page) {
// 	const res = await fetch("https://api.betterttv.net/3/emotes/shared/search?query=asd&offset=0&limit=50", {
// 		method: "GET",
// 		headers: {
// 			Accept: "application/json",
// 			"Sec-Fetch-Dest": "empty",
// 			"Sec-Fetch-Mode": "cors",
// 			"Sec-Fetch-Site": "cross-site",
// 			Pragma: "no-cache",
// 			"Cache-Control": "no-cache",
// 		},
// 	});
// }

async function iteratingFetch(fetch, query) {
	let emotes = [];
	let page = 1;
	let totalPages = 1;

	while (page <= totalPages) {
		const res = await fetch(query, page);
		emotes = emotes.concat(res.emotes);
		page++;
		totalPages = res.totalPages;
	}

	return emotes;
}

async function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

async function main() {
	console.log("Downloading emote lists");
	const emotes = [...(await iteratingFetch(sevenTvFetch, "Pepega")), ...(await iteratingFetch(frankerFaceZFetch, "Pepega"))];

	console.log("Saving");
	await writeFile("./data/all-emotes.json", JSON.stringify(emotes), { encoding: "utf-8" });

	for (const emote of emotes) {
		let retries = 0;
		while (retries++ < 10) {
			try {
				console.log(`Downloading ${emote.name} (${emote.id}) from ${emote.url} (#${retries})`);
				await downloadFile(emote.url, `./data/emotes/${emote.id}-${emote.name}`);
				break;
			}
			catch (e) {
				await sleep(5000);
			}
		}
	}
}

main();
