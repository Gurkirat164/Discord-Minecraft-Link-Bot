const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createProfile, formatProfileEmbed } = require('../../profiles');
const { getData } = require('../../utils/dataManager');
const { assignRole } = require('../../utils/roleManager');
const { updatePublicLog, updateAdminLog } = require('../../utils/logUpdater');

module.exports = {
    data: new SlashCommandBuilder()
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
                .setRequired(false)),
    
    async execute(interaction, client) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const inGameName = interaction.options.getString('ingamename');
        const rank = interaction.options.getString('rank');
        const endDateInput = interaction.options.getString('enddate');
        const channelLink = interaction.options.getString('channellink');

        let rankEndDate = null;
        let daysToAdd = 5; // Default to 5 days if not provided
        
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
            await assignRole(interaction.guild, user.id, rank, user.username);
            
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
            await updatePublicLog(client);
            await updateAdminLog(client);
        } else {
            await interaction.editReply(result.message);
        }
    }
};
