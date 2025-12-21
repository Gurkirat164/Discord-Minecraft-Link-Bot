const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { forceUpdateAll } = require('../../utils/serverUpdater');
const { updatePublicLog, updateAdminLog } = require('../../utils/logUpdater');
const { getData } = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Force update server status immediately')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            let updates = [];
            const { channels, logChannels } = getData();
            
            // Update server status embeds
            if (channels.length > 0) {
                await forceUpdateAll(client);
                updates.push('✅ Server status updated');
            }
            
            // Update public log
            if (logChannels.publicLog.channelId) {
                await updatePublicLog(client);
                updates.push('✅ Public log updated');
            }
            
            // Update admin log
            if (logChannels.adminLog.channelId) {
                await updateAdminLog(client);
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
};
