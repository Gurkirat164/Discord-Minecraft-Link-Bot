# Mc Status Discord Bot

A feature-rich Discord bot for monitoring Minecraft server status with auto-updating embeds, player tracking, and more.

## Features

### 🎮 Minecraft Server Monitoring
- **Real-time Status Updates** - Auto-updates server status every 5 minutes
- **Player Tracking** - Shows current online players and tracks peak player count
- **Multi-Server Support** - Monitor multiple servers (Survival, Lifesteal, etc.)
- **Multi-Channel Support** - Send status to multiple channels across different servers
- **Beautiful Embeds** - Custom embeds with logo and banner images
- **Persistent Data** - Saves peak players and channel configurations across restarts
- **Auto-Recovery** - Automatically sends new message if status message is deleted

### 💬 Slash Commands

**General Commands:**
- `/ping` - Check the bot's latency (Everyone)
- `/help` - Display all available commands (Everyone)

**Minecraft Server Commands:**
- `/mcstatus` - Get current Minecraft server status (Admin only)
- `/update` - Force immediate status update in all channels (Admin only)

**Profile Management Commands:**
- `/viewprofile [user]` - View a user's profile (Everyone)
- `/listprofiles` - Display all user profiles (Everyone)
- `/createprofile` - Create a new user profile with rank and details (Admin only)
- `/updateprofile` - Update an existing user profile (Admin only)
- `/deleteprofile` - Delete a user profile (Admin only)

**Configuration Commands:**
- `/set` - Configure bot settings (roles, channels, logs) (Admin only)
- `/unset` - Remove bot configurations (Admin only)

### 📊 Status Display
- Server address
- Online/Offline status with color indicators
- Minecraft version support (1.7.2 - 1.21.10)
- Current players / Max players
- Peak players record
- Individual server status (Survival & Lifesteal)

### 👥 User Profile Management
- **Create, Update, Delete** - Full CRUD operations for user profiles
- **Rank System** - Support for Media, Media+, and Admin ranks
- **Automatic Role Management** - Assigns/removes Discord roles based on rank
- **Time-Limited Ranks** - Set rank duration in days (minimum 5 days) or permanent
- **Expiration Notifications** - Automatic DM notifications at 2 days, 1 day, and expiration
- **Channel Links** - Associate YouTube/social media channels with profiles
- **DM Notifications** - Users receive DMs when profiles are created, updated, or deleted

### 📋 Logging System
- **Public Log** - Auto-updating member list embed organized by rank
- **Media Announcements** - Public notifications for rank expirations with user mentions
- **Admin Log** - Private admin view with expiration countdown tracking

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
```

**Note:** Status channels are now configured using the `/setchannel` command instead of environment variables.

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

### Initial Setup

1. **Set Status Channel**: Run `/setchannel` in any channel where you want status updates
   - The bot will send an initial status embed
   - This channel will be saved and auto-updated every 5 minutes

### Commands

Once the bot is online in your server:

**Basic Commands:**
- **`/ping`** - Test bot responsiveness and check API latency
- **`/help`** - View all available commands with detailed usage

**Server Status Commands:**
- **`/mcstatus`** - Manually check server status (Admin only)
- **`/update`** - Force immediate status update in all configured channels (Admin only)

**Profile Management Commands:**
- **`/createprofile`** - Create a user profile with rank, in-game name, channel link (Admin only)
  - Set rank duration in days (minimum 5) or use 0 for permanent
  - Valid ranks: media, media+, admin
  - Example: `/createprofile @User MinecraftName media https://youtube.com/channel 30`
- **`/updateprofile`** - Update profile information (Admin only)
  - Options: `adddays` (add to existing end date), `extenddays` (extend from today), `setdays` (new period from today)
  - Update rank, in-game name, or channel link
  - Example: `/updateprofile @User adddays:7`
- **`/deleteprofile`** - Remove a user profile (Admin only)
- **`/viewprofile [user]`** - View profile details (Everyone)
- **`/listprofiles`** - Display all profiles (Everyone)

**Configuration Commands:**
- **`/set`** - Configure bot settings (Admin only)
  - `type:publiclog` - Set public member list log channel
  - `type:mediaannouncements` - Set media announcements channel
  - `type:adminlog` - Set admin log channel
  - `type:statuschannel` - Set current channel for status updates
  - `type:mediarole` - Assign Discord role for media rank
  - `type:mediaplusrole` - Assign Discord role for media+ rank
  - Example: `/set type:mediarole role:@Media`
- **`/unset`** - Remove bot configurations (Admin only)
  - Remove role assignments: `/unset type:mediarole`

### Auto-Updates

The bot automatically updates the server status embed every 5 minutes in all configured channels. The same message is edited to avoid spam. If a status message is deleted, the bot will automatically send a new one.

### Peak Players

The bot tracks the highest number of players ever online and displays it in the embed. This data persists across restarts.

## File Structure

```
Dc Bot/
├── src/
│   ├── index.js       # Main bot file with command handlers and automation
│   ├── profiles.js    # Profile management module (CRUD operations)
│   ├── help.js        # Help system and command documentation
│   ├── mcStatus.js    # Server status logic and embed creation
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (not tracked in git)
├── .env.example      # Example environment file
├── data.json         # Persistent data (profiles, roles, channels, logs)
├── data.example.json # Example data structure
├── images/           # Embed images
│   ├── logo.png
│   └── banner.png
└── README.md         # This file
```

## Configuration

### Adding More Servers

Edit the `SURVIVAL_IP` and `LIFESTEAL_IP` values in `.env`, or add more servers by modifying `mcStatus.js`.

### Changing Update Interval

In `src/index.js`, modify this line (default is 5 minutes):
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
- Check bot has permissions in the channel (Send Messages, Embed Links, Attach Files)
- Run `/setchannel` in a channel where the bot has permissions
- Check bot role is high enough in server hierarchy

### Images not displaying
- Ensure `logo.png` and `banner.png` exist in `images/` folder
- Check file names match exactly (case-sensitive)
- Verify images are valid PNG files

### Peak players or channels not saving
- Check `data.json` file exists and is writable
- Verify bot has file system permissions
- Check console for error messages

### Status not updating automatically
- Make sure at least one channel is configured with `/setchannel`
- Check console logs for errors
- Verify bot is online and connected

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
