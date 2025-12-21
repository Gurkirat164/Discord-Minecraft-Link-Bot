const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { deleteProfile } = require('../../profiles');
const { removeRole } = require('../../utils/roleManager');
const { updatePublicLog, updateAdminLog } = require('../../utils/logUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteprofile')
        .setDescription('Delete a user profile (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile to delete')
                .setRequired(true)),
    
    async execute(interaction, client) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const result = deleteProfile(user.id);
        
        await interaction.editReply(result.message);
        
        // Remove Discord role if profile deletion was successful
        if (result.success && interaction.guild) {
            await removeRole(interaction.guild, user.id, result.profile.rank, user.username);
        }
        
        // Send DM to the user if deletion was successful
        if (result.success) {
            try {
                await user.send({
                    embeds: [{
                        color: 0xff0000,
                        title: '🗑️ Profile Deleted',
                        description: `Your profile has been deleted by ${interaction.user.username}.`,
                        footer: {
                            text: 'Contact an admin if you believe this was a mistake'
                        },
                        timestamp: new Date()
                    }]
                });
            } catch (error) {
                console.log(`❌ Could not DM user ${user.username}:`, error.message);
            }
        }
        
        // Update log channels
        if (result.success) {
            await updatePublicLog(client);
            await updateAdminLog(client);
        }
    }
};
