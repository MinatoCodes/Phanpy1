 module.exports = {
	config: {
		name: "truthordare",
		version: "1.0",
		aliases: ["tord"],
		author: "Minato",
		category: "fun",
		shortDescription: {
			en: "Play Truth or Dare game"
		}
	},

	langs: {
		vi: {
			choose: "Bạn muốn chọn Sự thật (truth) hay Thách thức (dare)?",
			truth: "🔍 Sự thật: %1",
			dare: "💪 Thách thức: %1",
			invalidChoice: "Vui lòng trả lời bằng 'truth' hoặc 'dare'",
			error: "Có lỗi xảy ra, vui lòng thử lại sau"
		},
		en: {
			choose: "Do you want Truth or Dare? (reply with 'truth' or 'dare')",
			truth: "🔍 Truth: %1",
			dare: "💪 Dare: %1",
			invalidChoice: "Please reply with either 'truth' or 'dare'",
			error: "An error occurred, please try again later"
		}
	},

	onStart: async function ({ message, event, getLang }) {
		const msg = await message.reply(getLang("choose"));

		// Register reply handler
		global.GoatBot.onReply.set(msg.messageID, {
			commandName: this.config.name,
			messageID: msg.messageID,
			author: event.senderID
		});
	},

	onReply: async function ({ message, event, Reply, getLang }) {
		if (event.senderID !== Reply.author) return;

		const choice = event.body.trim().toLowerCase();

		if (choice !== "truth" && choice !== "dare") {
			return message.reply(getLang("invalidChoice"));
		}

		try {
			const axios = require('axios');
			const apiUrl = choice === "truth" 
				? "https://truth-api.onrender.com/"
				: "https://dare-api-jlyv.onrender.com/";

			// Fetch JSON data from the API
			const response = await axios.get(apiUrl);
			const question = response.data?.data?.question;

			if (!question || typeof question !== "string") {
				throw new Error("Invalid or missing question in API response");
			}

			const langKey = choice === "truth" ? "truth" : "dare";
			message.reply(getLang(langKey, question));
		} catch (err) {
			console.error("Truth or Dare API Error:", err.message);
			message.reply(getLang("error"));

			// Fallback questions
			const fallback = {
				truth: [
					"What's the most embarrassing photo you have on your phone?",
					"Have you ever pretended to like a gift you hated?",
					"What's the biggest lie you've ever told?"
				],
				dare: [
					"Send the last photo in your gallery (no cheating!)",
					"Let the group choose your profile picture for a day",
					"Try to lick your elbow and send a video proof"
				]
			};

			const randomQuestion = fallback[choice][Math.floor(Math.random() * fallback[choice].length)];
			const langKey = choice === "truth" ? "truth" : "dare";
			message.reply(getLang(langKey, randomQuestion));
		}
	}
};
