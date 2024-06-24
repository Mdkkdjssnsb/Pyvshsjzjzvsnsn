const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LIMIT_FILE_PATH = path.resolve(__dirname, 'sexduf.json');
const DAILY_LIMIT = 5;

function loadLimits() {
  if (!fs.existsSync(LIMIT_FILE_PATH)) {
    return { date: "", users: {} };
  }
  return JSON.parse(fs.readFileSync(LIMIT_FILE_PATH, 'utf-8'));
}

function saveLimits(limits) {
  fs.writeFileSync(LIMIT_FILE_PATH, JSON.stringify(limits, null, 2));
}

function resetDailyLimits() {
  const limits = loadLimits();
  const today = new Date().toISOString().split('T')[0];
  if (limits.date !== today) {
    limits.date = today;
    limits.users = {};
    saveLimits(limits);
  }
}

function getUserLimit(userId) {
  const limits = loadLimits();
  return limits.users[userId] || 0;
}

function incrementUserLimit(userId) {
  const limits = loadLimits();
  limits.users[userId] = (limits.users[userId] || 0) + 1;
  saveLimits(limits);
}

module.exports = {
  config: {
    name: "bing",
    aliases: ["b"],
    version: "1.1",
    author: "ArYAN",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: 'Text to Image'
    },
    longDescription: {
      en: "Text to image"
    },
    category: "image",
    guide: {
      en: '{pn} your prompt'
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const text = args.join(" ");
    if (!text) {
      return message.reply("❓| Please provide a prompt.");
    }

    resetDailyLimits();
    const userId = event.senderID;
    const userLimit = getUserLimit(userId);

    if (userLimit >= DAILY_LIMIT) {
      return message.reply("⚠️| You have reached your daily limit of image requests.");
    }

    let prompt = text;

    message.reply(`✅| Creating your Imagination... (You have ${DAILY_LIMIT - userLimit} requests left today)`, async (err, info) => {
      let ui = info.messageID;
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
      try {
        const response = await axios.get(`https://globalapis.onrender.com/api/bing?prompt=${encodeURIComponent(prompt)}`);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
        const images = response.data.images;
        message.unsend(ui);
        message.reply({
          body: `🖼 [𝗕𝗜𝗡𝗚] \n━━━━━━━━━━━━\n\nPlease reply with the image number (1, 2, 3, 4) to get the corresponding image in high resolution.\nYou have ${DAILY_LIMIT - userLimit - 1} requests left today.`,
          attachment: await Promise.all(images.map(img => global.utils.getStreamFromURL(img)))
        }, async (err, info) => {
          if (err) return console.error(err);
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            imageUrls: images
          });
          incrementUserLimit(userId);
        });
      } catch (error) {
        console.error(error);
        api.sendMessage(`Error: ${error}`, event.threadID);
      }
    });
  },

  onReply: async function ({ api, event, Reply, usersData, args, message }) {
    const reply = parseInt(args[0]);
    const { author, imageUrls } = Reply;
    if (event.senderID !== author) return;
    try {
      if (reply >= 1 && reply <= 4) {
        const img = imageUrls[reply - 1];
        message.reply({ attachment: await global.utils.getStreamFromURL(img) });
      } else {
        message.reply("Invalid image number. Please reply with a number between 1 and 4.");
        return;
      }
    } catch (error) {
      console.error(error);
      api.sendMessage(`Error: ${error}`, event.threadID);
    }
    message.unsend(Reply.messageID); 
  },
};
