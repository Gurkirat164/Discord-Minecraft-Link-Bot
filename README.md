# Mc Status Discord Bot

A feature-rich Discord bot for monitoring Minecraft server status with auto-updating embeds, player tracking, and more.

## Features

### 🎮 Minecraft Server Monitoring
- **Real-time Status Updates** - Auto-updates server status every 5 minutes
- **Player Tracking** - Shows current online players and tracks peak player count
- **Multi-Server Support** - Monitor multiple servers (Survival, Lifesteal, etc.)
- **Beautiful Embeds** - Custom embeds with logo and banner images
- **Persistent Data** - Saves peak players and message references across restarts

### 💬 Slash Commands
- `/ping` - Check the bot's latency (Everyone)
- `/mcstatus` - Get current Minecraft server status (Admin only)
- `/update` - Force immediate status update, bypassing cooldown (Admin only)

### 📊 Status Display
- Server address
- Online/Offline status with color indicators
- Minecraft version support (1.7.2 - 1.21.10)
- Current players / Max players
- Peak players record
- Individual server status (Survival & Lifesteal)

## Prerequisites

- Node.js 16.9.0 or higher
- A Discord Bot Token
- Discord Server with Administrator permissions

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section:
   - Click "Add Bot"
   - Copy the bot token (you'll need this later)
   - Enable these **Privileged Gateway Intents**:
     - ✅ MESSAGE CONTENT INTENT
     - ✅ SERVER MEMBERS INTENT (optional, for future features)

4. Go to "OAuth2 > URL Generator":
   - **Scopes**: Select `bot` and `applications.commands`
   - **Bot Permissions**: Select `Administrator` (or at minimum: Send Messages, Embed Links, Attach Files, Read Messages)
   - Copy the generated URL and invite the bot to your server

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:
```env
DISCORD_TOKEN=your_actual_bot_token
MC_SERVERS=play.horizion.in
SURVIVAL_IP=survival.horizion.in
LIFESTEAL_IP=lifesteal.horizion.in
STATUS_CHANNEL_ID=your_channel_id_here
```

**To get Channel ID:**
- Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
- Right-click on a channel → Copy Channel ID

### 4. Add Images (Optional)

Place your custom images in the `images/` folder:
- `logo.png` - Displays as thumbnail in embed
- `banner.png` - Displays as footer image in embed

### 5. Run the Bot

**Development mode (auto-restart on file changes):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## Usage

### Commands

Once the bot is online in your server:

- **`/ping`** - Test bot responsiveness and check API latency
- **`/mcstatus`** - Manually check server status (Admin only)
- **`/update`** - Force immediate status update (Admin only)

### Auto-Updates

The bot automatically updates the server status embed every 5 minutes in the configured status channel. The same message is edited to avoid spam.

### Peak Players

The bot tracks the highest number of players ever online and displays it in the embed. This data persists across restarts.

## File Structure

```
Dc Bot/
├── index.js           # Main bot file
├── mcStatus.js        # Server status logic and embed creation
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (not tracked in git)
├── .env.example      # Example environment file
├── data.json         # Persistent data (peak players, message IDs)
├── images/           # Embed images
│   ├── logo.png
│   └── banner.png
└── README.md         # This file
```

## Configuration

### Adding More Servers

Edit the `SURVIVAL_IP` and `LIFESTEAL_IP` values in `.env`, or add more servers by modifying `mcStatus.js`.

### Changing Update Interval

In `index.js`, modify this line (default is 5 minutes):
```javascript
setInterval(updateStatus, 5 * 60 * 1000); // Change 5 to desired minutes
```

### Customizing Embed

Edit `mcStatus.js` to customize:
- Embed colors
- Field names and emojis
- Version display
- Status messages

## Troubleshooting

### Commands not showing up
- Wait 1-2 minutes for Discord to sync global commands
- Make sure bot has `applications.commands` scope
- Try kicking and re-inviting the bot
- Refresh Discord with `Ctrl + R`

### Bot can't send messages
- Check bot has permissions in the status channel
- Verify `STATUS_CHANNEL_ID` is correct
- Check bot role is high enough in server hierarchy

### Images not displaying
- Ensure `logo.png` and `banner.png` exist in `images/` folder
- Check file names match exactly (case-sensitive)
- Verify images are valid PNG files

### Peak players not saving
- Check `data.json` file exists and is writable
- Verify bot has file system permissions
- Check console for error messages

## Development

### Technologies Used
- **discord.js** v14 - Discord API wrapper
- **node-fetch** - HTTP requests for API calls
- **dotenv** - Environment variable management
- **nodemon** - Auto-restart during development

### API
- **mcstatus.io** - Minecraft server status API

## License

ISC

## Support

For issues or questions, check the bot's console logs for error messages. Common issues are related to missing environment variables or incorrect Discord permissions.
