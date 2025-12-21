const { SlashCommandBuilder } = require('discord.js');
const { getHelpEmbed } = require('../../help');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and their usage'),
    
    async execute(interaction) {
        await interaction.deferReply();
        const helpEmbed = getHelpEmbed();
        await interaction.editReply({ embeds: [helpEmbed] });
    }
};
