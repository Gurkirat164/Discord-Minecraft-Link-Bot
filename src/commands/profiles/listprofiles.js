const { SlashCommandBuilder } = require('discord.js');
const { getAllProfiles } = require('../../profiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listprofiles')
        .setDescription('List all user profiles'),
    
    async execute(interaction) {
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
};
