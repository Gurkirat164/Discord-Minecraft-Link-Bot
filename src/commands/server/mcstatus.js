const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createServerEmbeds } = require('../../mcStatus');
const { getData, saveData } = require('../../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Get Minecraft server status')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
        
        if (servers.length === 0) {
            await interaction.editReply('❌ No servers configured. Please add MC_SERVERS to your .env file.');
            return;
        }

        const { peakPlayers } = getData();
        const survivalIp = process.env.SURVIVAL_IP || '';
        const lifestealIp = process.env.LIFESTEAL_IP || '';
        const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp);
        
        if (!result.embeds || result.embeds.length === 0) {
            await interaction.editReply('❌ Failed to fetch server status.');
            return;
        }

        // Update peak players if current is higher
        if (result.currentOnline > peakPlayers) {
            const data = getData();
            data.peakPlayers = result.currentOnline;
            saveData(data);
            console.log(`🏆 New peak players record: ${result.currentOnline}`);
        }

        await interaction.editReply({ embeds: result.embeds, files: result.files });
    }
};
