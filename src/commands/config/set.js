const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createServerEmbeds } = require('../../mcStatus');
const { getData, saveData } = require('../../utils/dataManager');
const { updatePublicLog, updateAdminLog } = require('../../utils/logUpdater');

module.exports = {
    data: new SlashCommandBuilder()
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
                .setRequired(false)),
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const type = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const { channels, peakPlayers, rankRoles, logChannels } = getData();
        
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
                
                const targetChannel = await client.channels.fetch(channelId);
                const sentMessage = await targetChannel.send({ embeds: result.embeds, files: result.files });
                
                channels.push({
                    guildId: guildId,
                    channelId: channelId,
                    messageId: sentMessage.id
                });
                
                saveData({ channels, peakPlayers: Math.max(peakPlayers, result.currentOnline) });
                
                await interaction.editReply(`✅ Status channel set to ${channel}! Server status will be updated there every 5 minutes.`);
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
            logChannels.publicLog.mediaMessageId = null;
            logChannels.publicLog.mediaPlusMessageId = null;
            saveData({ logChannels });
            
            await updatePublicLog(client);
            await interaction.editReply(`✅ Public log channel set to ${channel}! Member list will be displayed there.`);
        }
        else if (type === 'mediaannouncements') {
            if (!channel) {
                await interaction.editReply('❌ Please provide a channel for this setting!');
                return;
            }
            
            logChannels.mediaAnnouncements.channelId = channel.id;
            saveData({ logChannels });
            
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
            saveData({ logChannels });
            
            await updateAdminLog(client);
            await interaction.editReply(`✅ Admin log channel set to ${channel}! Expiration tracking will be displayed there.`);
        }
        else if (type === 'mediarole' || type === 'mediaplusrole') {
            if (!role) {
                await interaction.editReply('❌ Please provide a role for this setting!');
                return;
            }
            
            const rank = type === 'mediarole' ? 'media' : 'media+';
            rankRoles[rank] = role.id;
            saveData({ rankRoles });
            
            await interaction.editReply(`✅ Role **${role.name}** has been set for rank **${rank.toUpperCase()}**!`);
            console.log(`🎭 Set role ${role.name} for rank ${rank}`);
        }
    }
};
