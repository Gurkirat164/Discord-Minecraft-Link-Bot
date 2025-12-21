const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateProfile, getProfile, formatProfileEmbed } = require('../../profiles');
const { updateRole } = require('../../utils/roleManager');
const { updatePublicLog, updateAdminLog } = require('../../utils/logUpdater');

module.exports = {
    data: new SlashCommandBuilder()
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
                .setRequired(false)),
    
    async execute(interaction, client) {
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
                await updateRole(interaction.guild, user.id, updates.rank, user.username);
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
            await updatePublicLog(client);
            await updateAdminLog(client);
        } else {
            await interaction.editReply(result.message);
        }
    }
};
