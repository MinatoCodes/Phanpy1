module.exports = {
	config: {
		name: "truthordare",
		version: "1.1",
		author: "NTKhang",
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
		// First ask the user to choose truth or dare
		message.reply(getLang("choose"));

		// Create a callback to handle the user's response
		const handleReply = ({ body, senderID }) => {
			// Check if the reply is from the same user who triggered the command
			if (senderID !== event.senderID) return;

			const choice = body.trim().toLowerCase();
			
			// Remove the reply handler to avoid memory leaks
			global.GoatBot.onReply.delete(event.messageID);
			
			if (choice !== "truth" && choice !== "dare") {
				return message.reply(getLang("invalidChoice"));
			}

			this.getQuestion(choice, message, getLang);
		};

		// Store the reply handler
		global.GoatBot.onReply.set(event.messageID, handleReply);
	},

	getQuestion: async function (choice, message, getLang) {
		try {
			let apiUrl;
			if (choice === "dare") {
				apiUrl = "https://dare-api-jlyv.onrender.com/";
			}
			else {
				apiUrl = "https://truth-api.onrender.com/";
			}

			const response = await global.utils.getStreamFromURL(apiUrl);
			const question = response?.question || response;
			
			if (!question) {
				throw new Error("No question received from API");
			}

			const langKey = choice === "truth" ? "truth" : "dare";
			message.reply(getLang(langKey, question));
		}
		catch (err) {
			console.error("Truth or Dare Error:", err);
			message.reply(getLang("error"));
			
			// Fallback questions if API fails
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
