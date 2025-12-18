# Discord Bot

A simple Discord bot with slash commands.

## Features
- `/ping` - Check the bot's latency

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications)
   - Go to the "Bot" section and create a bot
   - Copy the bot token
   - Enable "MESSAGE CONTENT INTENT" if needed
   - Go to OAuth2 > URL Generator, select "bot" and "applications.commands" scopes
   - Select appropriate permissions and invite the bot to your server

3. Add your bot token to the `.env` file:
```
DISCORD_TOKEN=your_actual_bot_token_here
```

4. Run the bot:
```bash
npm start
```

## Usage

Once the bot is online in your server, use:
- `/ping` - The bot will respond with its latency
