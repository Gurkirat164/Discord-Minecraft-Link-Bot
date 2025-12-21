require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createServerEmbeds } = require('./mcStatus');
const { createProfile, updateProfile, deleteProfile, getProfile, getAllProfiles, formatProfileEmbed, saveProfiles } = require('./profiles');
const { getHelpEmbed } = require('./help');
const fs = require('fs');
const path = require('path');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
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
        .setName('help')
        .setDescription('Display all available commands and their usage')
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
        .setName('createprofile')
        .setDescription('Create a new user profile (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to create a profile for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ingamename')
                .setDescription('In-game name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('User rank')
                .setRequired(true)
                .addChoices(
                    { name: 'Media', value: 'media' },
                    { name: 'Media+', value: 'media+' },
                    { name: 'Admin', value: 'admin' }
                ))
        .addStringOption(option =>
            option.setName('channellink')
                .setDescription('YouTube or social media channel link')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('enddate')
                .setDescription('Rank duration in days (min: 5, type "permanent" for permanent)')
                .setRequired(false))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('updateprofile')
        .setDescription('Update an existing user profile (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile to update')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ingamename')
                .setDescription('New in-game name')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('New rank')
                .setRequired(false)
                .addChoices(
                    { name: 'Media', value: 'media' },
                    { name: 'Media+', value: 'media+' },
                    { name: 'Admin', value: 'admin' }
                ))
        .addStringOption(option =>
            option.setName('channellink')
                .setDescription('New channel link (or "remove" to clear)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('adddays')
                .setDescription('Add days to existing end date (min: 5, type "permanent" for permanent)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('extenddays')
                .setDescription('Extend rank by days from current date (min: 5)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('setdays')
                .setDescription('Set new end date from today (min: 5, type "permanent" for permanent)')
                .setRequired(false))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('deleteprofile')
        .setDescription('Delete a user profile (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile to delete')
                .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('viewprofile')
        .setDescription('View a user profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile to view')
                .setRequired(false))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('listprofiles')
        .setDescription('List all user profiles')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configure bot settings (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What to configure')
                .setRequired(true)
                .addChoices(
                    { name: 'Public Log Channel', value: 'publiclog' },
                    { name: 'Media Announcements Channel', value: 'mediaannouncements' },
                    { name: 'Admin Log Channel', value: 'adminlog' },
                    { name: 'Status Update Channel', value: 'statuschannel' },
                    { name: 'Media Rank Role', value: 'mediarole' },
                    { name: 'Media+ Rank Role', value: 'mediaplusrole' }
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel (required for channel settings)')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Discord role (required for role settings)')
                .setRequired(false))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('unset')
        .setDescription('Remove bot configurations (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What to remove')
                .setRequired(true)
                .addChoices(
                    { name: 'Media Rank Role', value: 'mediarole' },
                    { name: 'Media+ Rank Role', value: 'mediaplusrole' }
                ))
        .toJSON()
];

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Store channel configurations and peak players
let channels = [];
let peakPlayers = 0;
let rankRoles = {}; // Store role IDs for each rank
let logChannels = {
    publicLog: { channelId: null, messageId: null },
    mediaAnnouncements: { channelId: null },
    adminLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null }
};

/**
 * Load data from file
 */
function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            peakPlayers = data.peakPlayers || 0;
            rankRoles = data.rankRoles || {};
            logChannels = data.logChannels || {
                publicLog: { channelId: null, messageId: null },
                mediaAnnouncements: { channelId: null },
                adminLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null }
            };
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
            channels,
            rankRoles,
            logChannels
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
    
    // Start checking for rank expiration notifications (every hour)
    startRankExpirationChecker();
    console.log('⏰ Started checking for rank expirations every hour');
    
    // Start admin log updater (every 30 minutes)
    startAdminLogUpdater();
    console.log('📊 Started admin log updater every 30 minutes');
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! Latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
    }

    if (interaction.commandName === 'help') {
        await interaction.deferReply();
        const helpEmbed = getHelpEmbed();
        await interaction.editReply({ embeds: [helpEmbed] });
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

        try {
            let updates = [];
            
            // Update server status embeds
            if (channels.length > 0) {
                await forceUpdateAll();
                updates.push('✅ Server status updated');
            }
            
            // Update public log
            if (logChannels.publicLog.channelId) {
                await updatePublicLog();
                updates.push('✅ Public log updated');
            }
            
            // Update admin log
            if (logChannels.adminLog.channelId) {
                await updateAdminLog();
                updates.push('✅ Admin log updated');
            }
            
            if (updates.length === 0) {
                await interaction.editReply('❌ No channels configured. Use `/set` to configure channels first.');
                return;
            }
            
            await interaction.editReply(`**All embeds updated successfully!**\n\n${updates.join('\n')}`);
        } catch (error) {
            console.error('❌ Error forcing update:', error);
            await interaction.editReply('❌ Failed to update embeds: ' + error.message);
        }
    }

    if (interaction.commandName === 'set') {
        await interaction.deferReply();
        
        const type = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        
        if (type === 'statuschannel') {
            if (!channel) {
                await interaction.editReply('❌ Please provide a channel for this setting!');
                return;
            }
            
            const channelId = channel.id;
            const guildId = interaction.guildId;
            
            const existingIndex = channels.findIndex(c => c.channelId === channelId && c.guildId === guildId);
            
            if (existingIndex !== -1) {
                await interaction.editReply('✅ This channel is already set for status updates!');
                return;
            }
            
            try {
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
                
                if (result.currentOnline > peakPlayers) {
                    peakPlayers = result.currentOnline;
                }
                
                const sentMessage = await interaction.channel.send({ embeds: result.embeds, files: result.files });
                
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
        else if (type === 'publiclog') {
            if (!channel) {
                await interaction.editReply('❌ Please provide a channel for this setting!');
                return;
            }
            
            logChannels.publicLog.channelId = channel.id;
            logChannels.publicLog.messageId = null;
            saveData();
            
            await updatePublicLog();
            await interaction.editReply(`✅ Public log channel set to ${channel}! Member list will be displayed there.`);
        }
        else if (type === 'mediaannouncements') {
            if (!channel) {
                await interaction.editReply('❌ Please provide a channel for this setting!');
                return;
            }
            
            logChannels.mediaAnnouncements.channelId = channel.id;
            saveData();
            
            await interaction.editReply(`✅ Media announcements channel set to ${channel}! Expiration notifications will be posted there.`);
        }
        else if (type === 'adminlog') {
            if (!channel) {
                await interaction.editReply('❌ Please provide a channel for this setting!');
                return;
            }
            
            logChannels.adminLog.channelId = channel.id;
            logChannels.adminLog.mediaMessageId = null;
            logChannels.adminLog.mediaPlusMessageId = null;
            saveData();
            
            await updateAdminLog();
            await interaction.editReply(`✅ Admin log channel set to ${channel}! Expiration tracking will be displayed there.`);
        }
        else if (type === 'mediarole' || type === 'mediaplusrole') {
            if (!role) {
                await interaction.editReply('❌ Please provide a role for this setting!');
                return;
            }
            
            const rank = type === 'mediarole' ? 'media' : 'media+';
            rankRoles[rank] = role.id;
            saveData();
            
            await interaction.editReply(`✅ Role **${role.name}** has been set for rank **${rank.toUpperCase()}**!`);
            console.log(`🎭 Set role ${role.name} for rank ${rank}`);
        }
    }

    // Profile Commands
    if (interaction.commandName === 'createprofile') {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const inGameName = interaction.options.getString('ingamename');
        const rank = interaction.options.getString('rank');
        const endDateInput = interaction.options.getString('enddate');
        const channelLink = interaction.options.getString('channellink');

        let rankEndDate = null;
        // Default to 5 days if not provided
        let daysToAdd = 5;
        
        if (endDateInput !== null) {
            if (endDateInput.toLowerCase() === 'permanent') {
                daysToAdd = 0; // Permanent
            } else {
                const parsedDays = parseInt(endDateInput);
                if (isNaN(parsedDays) || parsedDays < 5) {
                    await interaction.editReply('❌ Invalid input! Please enter a number of days (minimum 5) or type "permanent".');
                    return;
                }
                daysToAdd = parsedDays;
            }
        }
        
        if (daysToAdd > 0) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + daysToAdd);
            rankEndDate = endDate.toISOString();
        }

        const result = createProfile(user.id, user.username, inGameName, rank, rankEndDate, channelLink);
        
        if (result.success) {
            const embed = formatProfileEmbed(result.profile);
            await interaction.editReply({ content: result.message, embeds: [embed] });
            
            // Assign Discord role if configured for this rank
            if (rankRoles[rank] && interaction.guild) {
                try {
                    const member = await interaction.guild.members.fetch(user.id);
                    const role = await interaction.guild.roles.fetch(rankRoles[rank]);
                    if (role) {
                        await member.roles.add(role);
                        console.log(`✅ Assigned role ${role.name} to ${user.username}`);
                    }
                } catch (roleError) {
                    console.error(`❌ Failed to assign role to ${user.username}:`, roleError.message);
                }
            }
            
            // Send DM to the user
            try {
                const dmEmbed = {
                    color: 0x00ff00,
                    title: '✅ Profile Created',
                    description: `Your profile has been created by ${interaction.user.username}!`,
                    fields: embed.fields,
                    footer: embed.footer,
                    timestamp: embed.timestamp
                };
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`❌ Could not DM user ${user.username}:`, error.message);
            }
            
            // Update log channels
            await updatePublicLog();
            await updateAdminLog();
        } else {
            await interaction.editReply(result.message);
        }
    }

    if (interaction.commandName === 'updateprofile') {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const updates = {};

        const inGameName = interaction.options.getString('ingamename');
        const rank = interaction.options.getString('rank');
        const addDaysInput = interaction.options.getString('adddays');
        const extendDaysInput = interaction.options.getString('extenddays');
        const setDaysInput = interaction.options.getString('setdays');
        const channelLinkStr = interaction.options.getString('channellink');

        if (inGameName) updates.inGameName = inGameName;
        if (rank) updates.rank = rank;
        
        if (channelLinkStr) {
            if (channelLinkStr.toLowerCase() === 'remove') {
                updates.channelLink = null;
            } else {
                updates.channelLink = channelLinkStr;
            }
        }
        
        // Handle setdays - sets new end date from today and resets start date
        if (setDaysInput !== null) {
            if (setDaysInput.toLowerCase() === 'permanent') {
                updates.rankEndDate = null; // Permanent
            } else {
                const setDays = parseInt(setDaysInput);
                if (isNaN(setDays) || setDays < 5) {
                    await interaction.editReply('❌ Invalid input! Please enter a number of days (minimum 5) or type "permanent".');
                    return;
                }
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + setDays);
                updates.rankEndDate = endDate.toISOString();
            }
            updates.rankStartDate = new Date().toISOString(); // Reset start date
        }
        // Handle extenddays - extends rank by days from current date
        else if (extendDaysInput !== null) {
            const extendDays = parseInt(extendDaysInput);
            if (isNaN(extendDays) || extendDays < 5) {
                await interaction.editReply('❌ Invalid input! Please enter a number of days (minimum 5).');
                return;
            }
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + extendDays);
            updates.rankEndDate = endDate.toISOString();
        }
        // Handle adddays - adds days to existing end date
        else if (addDaysInput !== null) {
            const profile = getProfile(user.id);
            if (!profile) {
                await interaction.editReply('❌ Profile not found!');
                return;
            }
            
            if (addDaysInput.toLowerCase() === 'permanent') {
                updates.rankEndDate = null; // Make permanent
            } else {
                const addDays = parseInt(addDaysInput);
                if (isNaN(addDays) || addDays < 5) {
                    await interaction.editReply('❌ Invalid input! Please enter a number of days (minimum 5) or type "permanent".');
                    return;
                }
                if (profile.rankEndDate) {
                    const currentEndDate = new Date(profile.rankEndDate);
                    currentEndDate.setDate(currentEndDate.getDate() + addDays);
                    updates.rankEndDate = currentEndDate.toISOString();
                } else {
                    // If currently permanent, set from today
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + addDays);
                    updates.rankEndDate = endDate.toISOString();
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            await interaction.editReply('❌ Please provide at least one field to update!');
            return;
        }

        updates.username = user.username; // Always update username to keep it in sync
        const result = updateProfile(user.id, updates);
        
        if (result.success) {
            const embed = formatProfileEmbed(result.profile);
            await interaction.editReply({ content: result.message, embeds: [embed] });
            
            // Handle role changes if rank was updated
            if (updates.rank && interaction.guild) {
                try {
                    const member = await interaction.guild.members.fetch(user.id);
                    const oldProfile = getProfile(user.id);
                    
                    // Remove old role if it exists and is different
                    if (oldProfile && oldProfile.rank !== updates.rank && rankRoles[oldProfile.rank]) {
                        const oldRole = await interaction.guild.roles.fetch(rankRoles[oldProfile.rank]).catch(() => null);
                        if (oldRole && member.roles.cache.has(oldRole.id)) {
                            await member.roles.remove(oldRole);
                            console.log(`✅ Removed role ${oldRole.name} from ${user.username}`);
                        }
                    }
                    
                    // Add new role if configured
                    if (rankRoles[updates.rank]) {
                        const newRole = await interaction.guild.roles.fetch(rankRoles[updates.rank]).catch(() => null);
                        if (newRole && !member.roles.cache.has(newRole.id)) {
                            await member.roles.add(newRole);
                            console.log(`✅ Assigned role ${newRole.name} to ${user.username}`);
                        }
                    }
                } catch (roleError) {
                    console.error(`❌ Failed to update roles for ${user.username}:`, roleError.message);
                }
            }
            
            // Send DM to the user
            try {
                const dmEmbed = {
                    color: 0x0099ff,
                    title: '✏️ Profile Updated',
                    description: `Your profile has been updated by ${interaction.user.username}!`,
                    fields: embed.fields,
                    footer: embed.footer,
                    timestamp: embed.timestamp
                };
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`❌ Could not DM user ${user.username}:`, error.message);
            }
            
            // Update log channels
            await updatePublicLog();
            await updateAdminLog();
        } else {
            await interaction.editReply(result.message);
        }
    }

    if (interaction.commandName === 'deleteprofile') {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const result = deleteProfile(user.id);
        
        await interaction.editReply(result.message);
        
        // Remove Discord role if profile deletion was successful
        if (result.success && interaction.guild) {
            try {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && rankRoles[result.profile.rank]) {
                    const role = await interaction.guild.roles.fetch(rankRoles[result.profile.rank]).catch(() => null);
                    if (role && member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                        console.log(`✅ Removed role ${role.name} from ${user.username}`);
                    }
                }
            } catch (roleError) {
                console.error(`❌ Failed to remove role from ${user.username}:`, roleError.message);
            }
        }
        
        // Send DM to the user if deletion was successful
        if (result.success) {
            try {
                const dmEmbed = {
                    color: 0xff0000,
                    title: '🗑️ Profile Deleted',
                    description: `Your profile has been deleted by ${interaction.user.username}.`,
                    fields: [
                        {
                            name: '👤 Username',
                            value: result.profile.username,
                            inline: true
                        },
                        {
                            name: '🎮 In-Game Name',
                            value: result.profile.inGameName,
                            inline: true
                        },
                        {
                            name: '🏆 Rank',
                            value: result.profile.rank.toUpperCase(),
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                };
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`❌ Could not DM user ${user.username}:`, error.message);
            }
        }
        
        // Update log channels
        await updatePublicLog();
        await updateAdminLog();
    }

    if (interaction.commandName === 'viewprofile') {
        await interaction.deferReply();

        let user = interaction.options.getUser('user');
        if (!user) {
            user = interaction.user; // View own profile if no user specified
        }

        const profile = getProfile(user.id);
        
        if (!profile) {
            await interaction.editReply(`❌ No profile found for ${user.username}!`);
            return;
        }

        const embed = formatProfileEmbed(profile);
        await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'listprofiles') {
        await interaction.deferReply();

        const profiles = getAllProfiles();
        
        if (profiles.length === 0) {
            await interaction.editReply('❌ No profiles found!');
            return;
        }

        const rankEmoji = {
            'media': '📹',
            'media+': '🎬',
            'admin': '⚡'
        };

        const profileList = profiles.map(p => {
            return `${rankEmoji[p.rank] || '📋'} **${p.username}** - \`${p.inGameName}\` - \`${p.rank.toUpperCase()}\``;
        }).join('\n');

        const embed = {
            color: 0x0099ff,
            title: '📋 All Profiles',
            description: profileList,
            footer: {
                text: `Total Profiles: ${profiles.length}`
            },
            timestamp: new Date()
        };

        await interaction.editReply({ embeds: [embed] });
    }

    // Unset Configuration Command
    if (interaction.commandName === 'unset') {
        await interaction.deferReply();

        const type = interaction.options.getString('type');
        
        if (type === 'mediarole' || type === 'mediaplusrole') {
            const rank = type === 'mediarole' ? 'media' : 'media+';
            
            if (!rankRoles[rank]) {
                await interaction.editReply(`❌ No role configured for ${rank.toUpperCase()}!`);
                return;
            }

            delete rankRoles[rank];
            saveData();

            await interaction.editReply(`✅ Role configuration removed for rank **${rank.toUpperCase()}**!`);
            console.log(`🎭 Removed role configuration for rank ${rank}`);
        }
    }
});

/**
 * Update the public log with all media and media+ members
 */
async function updatePublicLog() {
    if (!logChannels.publicLog.channelId) return;
    
    try {
        const channel = await client.channels.fetch(logChannels.publicLog.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        
        const profiles = getAllProfiles();
        const mediaProfiles = profiles.filter(p => p.rank === 'media' && (!p.rankEndDate || new Date(p.rankEndDate) > new Date()));
        const mediaPlusProfiles = profiles.filter(p => p.rank === 'media+' && (!p.rankEndDate || new Date(p.rankEndDate) > new Date()));
        
        const mediaList = mediaProfiles.length > 0 
            ? mediaProfiles.map(p => `• **${p.username}** - \`${p.inGameName}\``).join('\n')
            : '*No active members*';
        
        const mediaPlusList = mediaPlusProfiles.length > 0
            ? mediaPlusProfiles.map(p => `• **${p.username}** - \`${p.inGameName}\``).join('\n')
            : '*No active members*';
        
        const embed = {
            color: 0x5865F2,
            title: '📋 Active Media Team Members',
            fields: [
                {
                    name: '📹 Media Members',
                    value: mediaList,
                    inline: false
                },
                {
                    name: '🎬 Media+ Members',
                    value: mediaPlusList,
                    inline: false
                }
            ],
            footer: {
                text: `Total Active: ${mediaProfiles.length + mediaPlusProfiles.length} members`
            },
            timestamp: new Date()
        };
        
        if (logChannels.publicLog.messageId) {
            try {
                const message = await channel.messages.fetch(logChannels.publicLog.messageId);
                await message.edit({ embeds: [embed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [embed] });
                logChannels.publicLog.messageId = sentMessage.id;
                saveData();
            }
        } else {
            const sentMessage = await channel.send({ embeds: [embed] });
            logChannels.publicLog.messageId = sentMessage.id;
            saveData();
        }
    } catch (error) {
        console.error('❌ Error updating public log:', error.message);
    }
}

/**
 * Update the admin log with expiration tracking
 */
async function updateAdminLog() {
    if (!logChannels.adminLog.channelId) return;
    
    try {
        const channel = await client.channels.fetch(logChannels.adminLog.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        
        const profiles = getAllProfiles();
        const now = new Date();
        
        const mediaProfiles = profiles.filter(p => p.rank === 'media' && p.rankEndDate && new Date(p.rankEndDate) > now);
        const mediaPlusProfiles = profiles.filter(p => p.rank === 'media+' && p.rankEndDate && new Date(p.rankEndDate) > now);
        
        // Media embed
        const mediaList = mediaProfiles.length > 0
            ? mediaProfiles.map(p => {
                const daysLeft = Math.ceil((new Date(p.rankEndDate) - now) / (1000 * 60 * 60 * 24));
                return `• <@${p.userId}> - Expires in **${daysLeft} day${daysLeft !== 1 ? 's' : ''}**`;
            }).join('\n')
            : '*No active members*';
        
        const mediaEmbed = {
            color: 0x0099ff,
            title: '📹 Media Rank Tracking',
            description: mediaList,
            footer: {
                text: `Active Media: ${mediaProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Media+ embed
        const mediaPlusList = mediaPlusProfiles.length > 0
            ? mediaPlusProfiles.map(p => {
                const daysLeft = Math.ceil((new Date(p.rankEndDate) - now) / (1000 * 60 * 60 * 24));
                return `• <@${p.userId}> - Expires in **${daysLeft} day${daysLeft !== 1 ? 's' : ''}**`;
            }).join('\n')
            : '*No active members*';
        
        const mediaPlusEmbed = {
            color: 0x00ff00,
            title: '🎬 Media+ Rank Tracking',
            description: mediaPlusList,
            footer: {
                text: `Active Media+: ${mediaPlusProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Update or send media embed
        if (logChannels.adminLog.mediaMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.adminLog.mediaMessageId);
                await message.edit({ embeds: [mediaEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaEmbed] });
                logChannels.adminLog.mediaMessageId = sentMessage.id;
                saveData();
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaEmbed] });
            logChannels.adminLog.mediaMessageId = sentMessage.id;
            saveData();
        }
        
        // Update or send media+ embed
        if (logChannels.adminLog.mediaPlusMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.adminLog.mediaPlusMessageId);
                await message.edit({ embeds: [mediaPlusEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
                logChannels.adminLog.mediaPlusMessageId = sentMessage.id;
                saveData();
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
            logChannels.adminLog.mediaPlusMessageId = sentMessage.id;
            saveData();
        }
    } catch (error) {
        console.error('❌ Error updating admin log:', error.message);
    }
}

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

/**
 * Start checking for rank expirations and send notifications
 */
async function startRankExpirationChecker() {
    const checkExpirations = async () => {
        try {
            const profiles = getAllProfiles();
            const now = new Date();
            let profilesUpdated = false;

            for (const profile of profiles) {
                // Skip if no end date (permanent rank)
                if (!profile.rankEndDate) continue;

                const endDate = new Date(profile.rankEndDate);
                const timeDiff = endDate - now;
                const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                // Initialize notifications object if it doesn't exist (for backward compatibility)
                if (!profile.notifications) {
                    profile.notifications = { twoDays: false, oneDay: false, ended: false };
                    profilesUpdated = true;
                }

                try {
                    const user = await client.users.fetch(profile.userId).catch(() => null);
                    if (!user) continue;

                    // Rank has ended
                    if (timeDiff <= 0 && !profile.notifications.ended) {
                        const embed = {
                            color: 0xff0000,
                            title: '⏰ Rank Expired',
                            description: `Your **${profile.rank.toUpperCase()}** rank has expired!`,
                            fields: [
                                {
                                    name: '🎮 In-Game Name',
                                    value: profile.inGameName,
                                    inline: true
                                },
                                {
                                    name: '🏆 Rank',
                                    value: profile.rank.toUpperCase(),
                                    inline: true
                                },
                                {
                                    name: '📅 Expired On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }),
                                    inline: false
                                }
                            ],
                            footer: {
                                text: 'Contact an admin if you need to renew your rank'
                            },
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.ended = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent expiration notification to ${profile.username}`);
                        
                        // Send DM to owner about the expired rank
                        if (process.env.OWNER_ID) {
                            try {
                                const owner = await client.users.fetch(process.env.OWNER_ID);
                                const ownerEmbed = {
                                    color: 0xff0000,
                                    title: '🚨 Rank Expired - Owner Notification',
                                    description: `A user's rank has expired and requires attention.`,
                                    fields: [
                                        {
                                            name: '👤 User',
                                            value: `<@${profile.userId}> (${profile.username})`,
                                            inline: true
                                        },
                                        {
                                            name: '🎮 In-Game Name',
                                            value: profile.inGameName,
                                            inline: true
                                        },
                                        {
                                            name: '🏆 Expired Rank',
                                            value: profile.rank.toUpperCase(),
                                            inline: true
                                        },
                                        {
                                            name: '📅 Expired On',
                                            value: endDate.toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            }),
                                            inline: false
                                        },
                                        {
                                            name: '🔗 Channel Link',
                                            value: profile.channelLink || 'N/A',
                                            inline: false
                                        },
                                        {
                                            name: '📋 Started On',
                                            value: new Date(profile.rankStartDate).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            }),
                                            inline: false
                                        }
                                    ],
                                    footer: {
                                        text: 'User ID: ' + profile.userId
                                    },
                                    timestamp: new Date()
                                };
                                await owner.send({ embeds: [ownerEmbed] });
                                console.log(`📧 Sent expiration notification to owner for ${profile.username}`);
                            } catch (ownerDmError) {
                                console.error(`❌ Could not DM owner about expired rank:`, ownerDmError.message);
                            }
                        }
                        
                        // Remove Discord role when rank expires
                        if (rankRoles[profile.rank]) {
                            try {
                                const guilds = client.guilds.cache;
                                for (const guild of guilds.values()) {
                                    const member = await guild.members.fetch(profile.userId).catch(() => null);
                                    if (member) {
                                        const role = await guild.roles.fetch(rankRoles[profile.rank]).catch(() => null);
                                        if (role && member.roles.cache.has(role.id)) {
                                            await member.roles.remove(role);
                                            console.log(`✅ Removed expired role ${role.name} from ${profile.username} in ${guild.name}`);
                                        }
                                    }
                                }
                            } catch (roleError) {
                                console.error(`❌ Failed to remove expired role from ${profile.username}:`, roleError.message);
                            }
                        }
                    }
                    // 1 day before expiration
                    else if (daysLeft === 1 && !profile.notifications.oneDay) {
                        const embed = {
                            color: 0xff9900,
                            title: '⚠️ Rank Expiring Soon',
                            description: `Your **${profile.rank.toUpperCase()}** rank will end in **1 day**!`,
                            fields: [
                                {
                                    name: '🎮 In-Game Name',
                                    value: profile.inGameName,
                                    inline: true
                                },
                                {
                                    name: '🏆 Rank',
                                    value: profile.rank.toUpperCase(),
                                    inline: true
                                },
                                {
                                    name: '📅 Expires On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                    inline: false
                                },
                                {
                                    name: '⏰ Action Required',
                                    value: 'Upload and verify your video with admins in the next **1 day** to maintain your rank!',
                                    inline: false
                                }
                            ],
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.oneDay = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent 1-day notification to ${profile.username}`);
                        
                        // Post to media announcements channel
                        if (logChannels.mediaAnnouncements.channelId) {
                            try {
                                const announcementChannel = await client.channels.fetch(logChannels.mediaAnnouncements.channelId);
                                await announcementChannel.send({ content: `<@${profile.userId}>`, embeds: [embed] });
                            } catch (error) {
                                console.error('❌ Error posting to media announcements:', error.message);
                            }
                        }
                    }
                    // 2 days before expiration
                    else if (daysLeft === 2 && !profile.notifications.twoDays) {
                        const embed = {
                            color: 0xffcc00,
                            title: '⚠️ Rank Expiring Soon',
                            description: `Your **${profile.rank.toUpperCase()}** rank will end in **2 days**!`,
                            fields: [
                                {
                                    name: '🎮 In-Game Name',
                                    value: profile.inGameName,
                                    inline: true
                                },
                                {
                                    name: '🏆 Rank',
                                    value: profile.rank.toUpperCase(),
                                    inline: true
                                },
                                {
                                    name: '📅 Expires On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                    inline: false
                                },
                                {
                                    name: '⏰ Action Required',
                                    value: 'Upload and verify your video with admins in the next **2 days** to maintain your rank!',
                                    inline: false
                                }
                            ],
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.twoDays = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent 2-day notification to ${profile.username}`);
                        
                        // Post to media announcements channel
                        if (logChannels.mediaAnnouncements.channelId) {
                            try {
                                const announcementChannel = await client.channels.fetch(logChannels.mediaAnnouncements.channelId);
                                await announcementChannel.send({ content: `<@${profile.userId}>`, embeds: [embed] });
                            } catch (error) {
                                console.error('❌ Error posting to media announcements:', error.message);
                            }
                        }
                    }
                } catch (dmError) {
                    console.log(`❌ Could not DM user ${profile.username}:`, dmError.message);
                }
            }

            // Save updated profiles with notification status only if there were changes
            if (profilesUpdated) {
                saveProfiles(profiles);
                console.log(`💾 Saved notification status for profiles`);
                
                // Update log channels when profiles change
                await updatePublicLog();
                await updateAdminLog();
            }
        } catch (error) {
            console.error('❌ Error checking rank expirations:', error);
        }
    };

    // Check immediately on start
    checkExpirations();
    
    // Check every hour (3600000 ms)
    setInterval(checkExpirations, 60 * 60 * 1000);
}

/**
 * Start periodic admin log updates
 */
async function startAdminLogUpdater() {
    const updateLogs = async () => {
        try {
            await updateAdminLog();
        } catch (error) {
            console.error('❌ Error in admin log updater:', error);
        }
    };
    
    // Update immediately on start
    updateLogs();
    
    // Update every 30 minutes
    setInterval(updateLogs, 30 * 60 * 1000);
}

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
