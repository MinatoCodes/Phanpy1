const axios = require('axios');

const GENIUS_API_TOKEN = 'ZGt3AiGSqQNxwd4btk74q_AgaTq3tfixIKjgUdoCRXQwz_rnJW4dQxbslJa8N0MT'; // Replace with your actual Genius token

module.exports = {
    config: {
        name: "lyrics",
        version: "1.0",
        author: "NTKhang",
        countDown: 5,
        role: 0,
        shortDescription: {
            vi: "lấy lời bài hát",
            en: "fetch song lyrics"
        },
        description: {
            vi: "lệnh này lấy lời bài hát từ tên bài hát được cung cấp",
            en: "this command fetches lyrics from the provided song title"
        },
        category: "music",
        guide: {
            vi: "sử dụng: !lyrics <tên bài hát>",
            en: "usage: !lyrics <song title>"
        }
    },

    langs: {
        vi: {
            notProvideSong: "Vui lòng cung cấp tên bài hát.",
            lyricsNotFound: "Không tìm thấy lời bài hát cho bài hát này.",
            lyricsFetched: "Đây là lời bài hát bạn yêu cầu:"
        },
        en: {
            notProvideSong: "Please provide a song title.",
            lyricsNotFound: "Lyrics not found for this song.",
            lyricsFetched: "Here are the lyrics you requested:"
        }
    },

    onStart: async function ({ api, args, message, getLang }) {
        const songTitle = args.join(" ");
        if (!songTitle) {
            return message.reply(getLang("notProvideSong"));
        }

        try {
            // Search song on Genius API
            const searchRes = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(songTitle)}`, {
                headers: {
                    Authorization: `Bearer ${GENIUS_API_TOKEN}`
                }
            });

            const hits = searchRes.data.response.hits;

            if (!hits.length) {
                return message.reply(getLang("lyricsNotFound"));
            }

            const song = hits[0].result;

            // Fetch song page HTML to scrape lyrics
            const songPageUrl = song.url;
            const pageRes = await axios.get(songPageUrl);
            const html = pageRes.data;

            // Simple regex or cheerio can be used to extract lyrics
            // Here minimal regex-based extraction (optional: integrate cheerio)
            const cheerio = require("cheerio");
            const $ = cheerio.load(html);

            let lyrics = "";

            // Try the main lyrics div
            lyrics = $(".lyrics").text().trim();

            if (!lyrics) {
                // New Genius page layout - multiple divs with data-lyrics-container="true"
                lyrics = $('[data-lyrics-container="true"]').map((i, elem) => $(elem).text()).get().join("\n").trim();
            }

            if (!lyrics) {
                return message.reply(getLang("lyricsNotFound"));
            }

            // Truncate if too long for message
            const maxLength = 1900;
            const output = lyrics.length > maxLength ? lyrics.slice(0, maxLength) + "\n...[Truncated]" : lyrics;

            return message.reply(`${getLang("lyricsFetched")}\n\n${output}`);
        } catch (error) {
            console.error(error);
            return message.reply(getLang("lyricsNotFound"));
        }
    }
};

          
