const { SlashCommandBuilder } = require('discord.js');
const { getProfile, formatProfileEmbed } = require('../../profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viewprofile')
        .setDescription('View a user profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile to view')
                .setRequired(false)),
    
    async execute(interaction) {
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
};
