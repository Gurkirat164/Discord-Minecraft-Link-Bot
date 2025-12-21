const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveData } = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unset')
        .setDescription('Remove bot configurations (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What to remove')
                .setRequired(true)
                .addChoices(
                    { name: 'Media Rank Role', value: 'mediarole' },
                    { name: 'Media+ Rank Role', value: 'mediaplusrole' }
                )),
    
    async execute(interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString('type');
        const { rankRoles } = getData();
        
        if (type === 'mediarole' || type === 'mediaplusrole') {
            const rank = type === 'mediarole' ? 'media' : 'media+';
            
            if (!rankRoles[rank]) {
                await interaction.editReply(`❌ No role configured for ${rank.toUpperCase()}!`);
                return;
            }

            delete rankRoles[rank];
            saveData({ rankRoles });

            await interaction.editReply(`✅ Role configuration removed for rank **${rank.toUpperCase()}**!`);
            console.log(`🎭 Removed role configuration for rank ${rank}`);
        }
    }
};
