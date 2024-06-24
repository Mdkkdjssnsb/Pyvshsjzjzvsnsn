const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const LimitsFilePath = path.join(__dirname, 'userdhfddata.json');

let UserLimits = new Map();

// Load user limits from the JSON file
try {
  const limitsData = fs.readFileSync(LimitsFilePath, 'utf8');
  UserLimits = new Map(JSON.parse(limitsData));
} catch (error) {
  console.error("Error loading user limits:", error.message);
}

module.exports = {
  config: {
    name: 'lyrics',
    version: '2.0',
    author: 'ArYAN',
    role: 0,
    category: 'music',
    longDescription: {
      en: 'This command allow to you for search songs lyrics from Google',
    },
    guide: {
      en: '{p}lyrics [ Song Name ]',
    },
  },

  onStart: async function ({ api, event, args }) {
    let userLimit; // Declare userLimit here

    try {
      const userId = event.senderID;
      userLimit = UserLimits.get(userId) || 0; // Assign value here

      const songName = args.join(" ");
      if (!songName) {
        api.sendMessage(`⛔ 𝗜𝗻𝘃𝗮𝗹𝗶𝗱 𝗧𝗶𝘁𝗹𝗲 ( ${userLimit}/20 )\n\n➤ Please provide a song name!`, event.threadID, event.messageID);
        return;
      }

      // Check user's daily limits
      if (userLimit >= 20) {
        await api.sendMessage("You have reached your daily limits.", event.threadID, event.messageID);
        return;
      }

      const apiUrl = `https://globalapis.onrender.com/api/lyrics?songName=${encodeURIComponent(songName)}`;
      const response = await axios.get(apiUrl);
      const { lyrics, title, artist, image } = response.data;

      if (!lyrics) {
        api.sendMessage(`⛔ 𝗡𝗼𝘁 𝗙𝗼𝘂𝗻𝗱 ( ${userLimit}/20 )\n\n➤ Sorry, lyrics not found, please provide another song name!`, event.threadID, event.messageID);
        return;
      }

      let message = `🎶 𝗟𝗬𝗥𝗜𝗖𝗦 ( ${userLimit}/20 )\n\nℹ️ 𝗧𝗶𝘁𝗹𝗲\n➪ ${title}\n👑 𝗔𝗿𝘁𝗶𝘀𝘁\n➪ ${artist}\n🔎 𝗟𝘆𝗿𝗶𝗰𝘀\n━━━━━━━━━━━━━━━\n${lyrics}`;
      let attachment = await global.utils.getStreamFromURL(image);
      api.sendMessage({ body: message, attachment }, event.threadID, (err, info) => {
        let id = info.messageID;
      });

      // Increment user's daily limit
      UserLimits.set(userId, userLimit + 1);

      // Save user limits to the JSON file
      fs.writeFileSync(LimitsFilePath, JSON.stringify([...UserLimits]), 'utf8');
    } catch (error) {
      console.error(error);
      api.sendMessage(`⛔ 𝗦𝗲𝗿𝘃𝗲𝗿 𝗘𝗿𝗿𝗼𝗿 ( ${userLimit}/10 )\n\n➤ Sorry, there was an error getting the lyrics! ${error.message}`, event.threadID, event.messageID);
    }
  },
};
