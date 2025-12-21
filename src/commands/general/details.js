const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Function to create the details embed
function createDetailsEmbed() {
    return new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('📝 Media Rank Application Details')
        .setDescription('Please provide the following information:')
        .addFields(
            {
                name: '🎮 In-Game Name',
                value: 'Your Minecraft username',
                inline: false
            },
            {
                name: '🔗 Channel Link',
                value: 'Your YouTube channel URL',
                inline: false
            }
        )
        .setFooter({ text: 'Please submit your details in the designated channel' })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('details')
        .setDescription('Submit your details for Media rank application'),
    
    async execute(interaction) {
        await interaction.reply({ embeds: [createDetailsEmbed()] });
    },
    
    // Export the embed creator function
    createDetailsEmbed
};
