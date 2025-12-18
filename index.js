require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createServerEmbeds } = require('./mcStatus');
const fs = require('fs');
const path = require('path');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,    // To receive message events
        GatewayIntentBits.MessageContent    // To read message content (privileged intent)
    ] 
});

// Define the commands
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Get Minecraft server status')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('update')
        .setDescription('Force update server status immediately')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the channel for server status updates')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
];

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Store channel configurations and peak players
let channels = [];
let peakPlayers = 0;

/**
 * Load data from file
 */
function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            peakPlayers = data.peakPlayers || 0;
            // Migrate old statusMessages format to new channels format
            if (data.statusMessages && !data.channels) {
                channels = data.statusMessages.map(msg => ({
                    guildId: null,
                    channelId: msg.channelId,
                    messageId: msg.messageId
                }));
            } else {
                channels = data.channels || [];
            }
            console.log(`📊 Loaded data: Peak Players = ${peakPlayers}, Channels = ${channels.length}`);
        }
    } catch (error) {
        console.error('❌ Error loading data:', error.message);
    }
}

/**
 * Save data to file
 */
function saveData() {
    try {
        const data = {
            peakPlayers,
            channels
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving data:', error.message);
    }
}

// When the client is ready, run this code once
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    // Load saved data
    loadData();
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }

    // Start auto-update for status embeds (every 5 minutes)
    startAutoUpdate();
    console.log('🔄 Started auto-updating server status every 5 minutes');
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! Latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
    }

    if (interaction.commandName === 'mcstatus') {
        await interaction.deferReply();
        
        const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
        
        if (servers.length === 0) {
            await interaction.editReply('❌ No servers configured. Please add MC_SERVERS to your .env file.');
            return;
        }

        const survivalIp = process.env.SURVIVAL_IP || '';
        const lifestealIp = process.env.LIFESTEAL_IP || '';
        const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp);
        
        if (!result.embeds || result.embeds.length === 0) {
            await interaction.editReply('❌ Failed to fetch server status.');
            return;
        }

        // Update peak players if current is higher
        if (result.currentOnline > peakPlayers) {
            peakPlayers = result.currentOnline;
            saveData();
            console.log(`🏆 New peak players record: ${peakPlayers}`);
        }

        await interaction.editReply({ embeds: result.embeds, files: result.files });
    }

    if (interaction.commandName === 'update') {
        await interaction.deferReply({ ephemeral: true });
        
        if (channels.length === 0) {
            await interaction.editReply('❌ No status channels configured. Use `/setchannel` first.');
            return;
        }

        try {
            await forceUpdateAll();
            await interaction.editReply('✅ Server status updated successfully in all channels!');
        } catch (error) {
            console.error('❌ Error forcing update:', error);
            await interaction.editReply('❌ Failed to update server status.');
        }
    }

    if (interaction.commandName === 'setchannel') {
        await interaction.deferReply({ ephemeral: true });
        
        const channelId = interaction.channelId;
        const guildId = interaction.guildId;
        
        // Check if this channel is already configured
        const existingIndex = channels.findIndex(c => c.channelId === channelId && c.guildId === guildId);
        
        if (existingIndex !== -1) {
            await interaction.editReply('✅ This channel is already set for status updates!');
            return;
        }
        
        try {
            // Send initial status message
            const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
            if (servers.length === 0) {
                await interaction.editReply('❌ No servers configured in .env file.');
                return;
            }
            
            const survivalIp = process.env.SURVIVAL_IP || '';
            const lifestealIp = process.env.LIFESTEAL_IP || '';
            const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp);
            
            if (!result.embeds || result.embeds.length === 0) {
                await interaction.editReply('❌ Failed to fetch server status.');
                return;
            }
            
            // Update peak players if needed
            if (result.currentOnline > peakPlayers) {
                peakPlayers = result.currentOnline;
            }
            
            // Send the status message
            const sentMessage = await interaction.channel.send({ embeds: result.embeds, files: result.files });
            
            // Save channel configuration
            channels.push({
                guildId: guildId,
                channelId: channelId,
                messageId: sentMessage.id
            });
            saveData();
            
            await interaction.editReply('✅ Status channel set! Server status will be updated here every 5 minutes.');
            console.log(`🎮 Set status channel: ${channelId} in guild: ${guildId}`);
        } catch (error) {
            console.error('❌ Error setting channel:', error);
            await interaction.editReply('❌ Failed to set status channel.');
        }
    }
});

/**
 * Force update the server status immediately in all configured channels
 */
async function forceUpdateAll() {
    const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
    if (servers.length === 0) {
        throw new Error('No servers configured');
    }

    const survivalIp = process.env.SURVIVAL_IP || '';
    const lifestealIp = process.env.LIFESTEAL_IP || '';
    const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp);
    
    if (!result.embeds || result.embeds.length === 0) {
        throw new Error('No embeds generated');
    }

    // Update peak players if current is higher
    if (result.currentOnline > peakPlayers) {
        peakPlayers = result.currentOnline;
        saveData();
        console.log(`🏆 New peak players record: ${peakPlayers}`);
    }

    // Update all configured channels
    for (const channelConfig of channels) {
        try {
            const channel = await client.channels.fetch(channelConfig.channelId).catch(() => null);
            
            if (!channel || !channel.isTextBased()) {
                console.error(`❌ Channel ${channelConfig.channelId} not found or invalid`);
                continue;
            }

            // Try to update existing message
            if (channelConfig.messageId) {
                try {
                    const message = await channel.messages.fetch(channelConfig.messageId);
                    await message.edit({ embeds: result.embeds, files: result.files });
                    console.log(`✅ Updated message in channel ${channelConfig.channelId}`);
                } catch (error) {
                    // Message was deleted, send a new one
                    console.log(`⚠️ Message deleted in ${channelConfig.channelId}, sending new one`);
                    const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                    channelConfig.messageId = sentMessage.id;
                    saveData();
                }
            } else {
                // No message ID, send new message
                const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                channelConfig.messageId = sentMessage.id;
                saveData();
            }
        } catch (error) {
            console.error(`❌ Error updating channel ${channelConfig.channelId}:`, error.message);
        }
    }
    
    console.log(`✅ Forced update at ${new Date().toLocaleTimeString()}`);
}

/**
 * Start auto-updating server status embeds
 */
async function startAutoUpdate() {
    const updateStatus = async () => {
        try {
            if (channels.length === 0) {
                console.log('⚠️ No channels configured for auto-update');
                return;
            }

            await forceUpdateAll();
        } catch (error) {
            console.error('❌ Error updating status:', error);
            console.error('Full error details:', error.stack);
        }
    };

    // Initial update
    updateStatus();
    
    // Update every 5 minutes (300000 ms)
    setInterval(updateStatus, 5 * 60 * 1000);
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
