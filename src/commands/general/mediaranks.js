const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Function to create media rank embeds
function createMediaRankEmbeds() {
    // Media Rank Embed
    const mediaEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📺 Media Rank')
        .addFields(
            {
                name: '📋 Requirements',
                value: '• 100+ Subs\n• Channel must have videos related to Minecraft\n• Active Channel [Frequently Uploading Videos]',
                inline: false
            },
            {
                name: '🎁 Perks Survival',
                value: '• 2 Auction House Limit\n• 2 Jobs Limit\n• 2 Set Homes\n• 15 Chest Shops\n• Media Kit [Cooldown 5 Days]\n• Vip Kit [Cooldown 7 Days]',
                inline: false
            },
            {
                name: '⏱️ Duration',
                value: 'Every Verified Video Grants you Media rank for 5 days.',
                inline: false
            }
        )
        .setTimestamp();

    // Media+ Rank Embed
    const mediaPlusEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('⭐ Media+ Rank')
        .addFields(
            {
                name: '📋 Requirements',
                value: '• 500+ Subs\n• Channel must have videos related to Minecraft\n• Active Channel [Frequently Uploading Videos]',
                inline: false
            },
            {
                name: '🎁 Survival Perks',
                value: '• 3 Auction House Limit\n• 2 Jobs Limit\n• 3 Set Homes\n• 20 Chest Shops\n• Media+ Kit [Cooldown 5 Days]\n• MVP Kit [Cooldown 7 Days]',
                inline: false
            },
            {
                name: '⏱️ Duration',
                value: 'Every Verified Video Grants you Media+ rank for 5 days.',
                inline: false
            }
        )
        .setTimestamp();

    return [mediaEmbed, mediaPlusEmbed];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mediaranks')
        .setDescription('Display Media and Media+ rank requirements and perks'),
    
    async execute(interaction) {
        const embeds = createMediaRankEmbeds();
        await interaction.reply({ embeds });
    },
    
    // Export the embed creator function
    createMediaRankEmbeds
};
