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
        .toJSON()
];

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Store message references and peak players
let statusMessages = [];
let peakPlayers = 0;

/**
 * Load data from file
 */
function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            peakPlayers = data.peakPlayers || 0;
            statusMessages = data.statusMessages || [];
            console.log(`📊 Loaded data: Peak Players = ${peakPlayers}, Status Messages = ${statusMessages.length}`);
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
            statusMessages
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
    if (process.env.STATUS_CHANNEL_ID && process.env.STATUS_CHANNEL_ID !== 'your_channel_id_here') {
        startAutoUpdate();
        console.log('🔄 Started auto-updating server status every 5 minutes');
    }
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
        
        if (!process.env.STATUS_CHANNEL_ID || process.env.STATUS_CHANNEL_ID === 'your_channel_id_here') {
            await interaction.editReply('❌ Status channel not configured.');
            return;
        }

        try {
            await forceUpdate();
            await interaction.editReply('✅ Server status updated successfully!');
        } catch (error) {
            console.error('❌ Error forcing update:', error);
            await interaction.editReply('❌ Failed to update server status.');
        }
    }
});

/**
 * Force update the server status immediately
 */
async function forceUpdate() {
    const channelId = process.env.STATUS_CHANNEL_ID;
    const channel = await client.channels.fetch(channelId).catch(err => {
        console.error('❌ Failed to fetch channel:', err.message);
        return null;
    });
    
    if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel');
    }

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

    // Update or send message
    if (statusMessages.length === 0) {
        const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
        statusMessages.push({
            channelId: channel.id,
            messageId: sentMessage.id
        });
        saveData();
    } else {
        for (const msgRef of statusMessages) {
            try {
                const message = await channel.messages.fetch(msgRef.messageId);
                await message.edit({ embeds: result.embeds, files: result.files });
            } catch (error) {
                console.error('❌ Failed to update message:', error.message);
                const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                msgRef.messageId = sentMessage.id;
                saveData();
            }
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
            const channelId = process.env.STATUS_CHANNEL_ID;
            const channel = await client.channels.fetch(channelId).catch(err => {
                console.error('❌ Failed to fetch channel:', err.message);
                return null;
            });
            
            if (!channel) {
                console.error('❌ Channel not found. Please check STATUS_CHANNEL_ID in .env');
                return;
            }

            if (!channel.isTextBased()) {
                console.error('❌ Invalid status channel - not a text channel');
                return;
            }

            const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
            if (servers.length === 0) {
                console.error('❌ No servers configured in MC_SERVERS');
                return;
            }

            const survivalIp = process.env.SURVIVAL_IP || '';
            const lifestealIp = process.env.LIFESTEAL_IP || '';
            const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp);
            
            if (!result.embeds || result.embeds.length === 0) {
                console.error('❌ No embeds generated');
                return;
            }

            // Update peak players if current is higher
            if (result.currentOnline > peakPlayers) {
                peakPlayers = result.currentOnline;
                saveData();
                console.log(`🏆 New peak players record: ${peakPlayers}`);
            }

            // If no messages stored, send new ones
            if (statusMessages.length === 0) {
                const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                statusMessages.push({
                    channelId: channel.id,
                    messageId: sentMessage.id
                });
                saveData();
            } else {
                // Update existing messages
                for (const msgRef of statusMessages) {
                    try {
                        const message = await channel.messages.fetch(msgRef.messageId);
                        await message.edit({ embeds: result.embeds, files: result.files });
                    } catch (error) {
                        console.error('❌ Failed to update message:', error.message);
                        // If message was deleted, send a new one
                        const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                        msgRef.messageId = sentMessage.id;
                        saveData();
                    }
                }
            }
            
            console.log(`✅ Updated server status at ${new Date().toLocaleTimeString()}`);
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
