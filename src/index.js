require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { loadData } = require('./utils/dataManager');
const { createDetailsEmbed } = require('./commands/general/details');
const { createMediaRankEmbeds } = require('./commands/general/mediaranks');
const { getProfile } = require('./profiles');
const { startAutoUpdate } = require('./utils/serverUpdater');
const { startAdminLogUpdater } = require('./utils/logUpdater');
const { startRankExpirationChecker } = require('./utils/expirationChecker');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Collection to store commands
client.commands = new Collection();

/**
 * Load commands from commands folder
 */
function loadCommands() {
    const commands = [];
    const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(`./commands/${folder}/${file}`);
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: /${command.data.name}`);
        }
    }

    return commands;
}

// When the client is ready, run this code once
client.once('clientReady', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    // Load saved data
    loadData();
    
    // Load commands
    const commands = loadCommands();
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }

    // Start auto-update for status embeds (every 5 minutes)
    startAutoUpdate(client);
    console.log('🔄 Started auto-updating server status every 5 minutes');
    
    // Start checking for rank expiration notifications (every hour)
    startRankExpirationChecker(client);
    console.log('⏰ Started checking for rank expirations every hour');
    
    // Start admin log updater (every 30 minutes)
    startAdminLogUpdater(client);
    console.log('📊 Started admin log updater every 30 minutes');
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        console.error(`❌ Command ${interaction.commandName} not found!`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);
        const errorMessage = '❌ There was an error executing this command!';
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(errorMessage).catch(console.error);
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
        }
    }
});

// Handle messages for admin commands
client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Get user profile for admin commands
    const userProfile = getProfile(message.author.id);
    
    // Check if message is "askdetails" and user has admin profile
    if (message.content.toLowerCase() === 'askdetails') {
        if (!userProfile || userProfile.rank !== 'admin') {
            return;
        }
        
        // Send the details embed from details.js
        await message.channel.send({ embeds: [createDetailsEmbed()] });
    }
    
    // Check if message is "mediaranks" and user has admin profile
    if (message.content.toLowerCase() === 'mediaranks') {
        if (!userProfile || userProfile.rank !== 'admin') {
            return;
        }
        
        // Send the mediaranks embeds from mediaranks.js
        const embeds = createMediaRankEmbeds();
        await message.channel.send({ embeds });
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
