const { createServerEmbeds } = require('../mcStatus');
const { getData, saveData } = require('./dataManager');

/**
 * Force update the server status immediately in all configured channels
 */
async function forceUpdateAll(client) {
    const { channels, peakPlayers } = getData();
    const servers = process.env.MC_SERVERS?.split(',').map(s => s.trim()) || [];
    if (servers.length === 0) {
        throw new Error('No servers configured');
    }

    const survivalIp = process.env.SURVIVAL_IP || '';
    const lifestealIp = process.env.LIFESTEAL_IP || '';
    const pvpIp = process.env.PVP_IP || '';
    const survival2Ip = process.env.SURVIVAL_2_IP || '';
    const result = await createServerEmbeds(servers, peakPlayers, survivalIp, lifestealIp, pvpIp, survival2Ip);
    
    if (!result.embeds || result.embeds.length === 0) {
        throw new Error('No embeds generated');
    }

    // Update peak players if current is higher
    if (result.currentOnline > peakPlayers) {
        saveData({ peakPlayers: result.currentOnline });
        console.log(`🏆 New peak players record: ${result.currentOnline}`);
    }

    // Update all configured channels
    for (const channelConfig of channels) {
        try {
            const channel = await client.channels.fetch(channelConfig.channelId).catch(() => null);
            
            if (!channel || !channel.isTextBased()) {
                console.error(`❌ Channel ${channelConfig.channelId} not found or invalid`);
                continue;
            }

            // Try to update existing message
            if (channelConfig.messageId) {
                try {
                    const message = await channel.messages.fetch(channelConfig.messageId);
                    await message.edit({ embeds: result.embeds, files: result.files });
                    console.log(`✅ Updated message in channel ${channelConfig.channelId}`);
                } catch (error) {
                    // Message was deleted, send a new one
                    console.log(`⚠️ Message deleted in ${channelConfig.channelId}, sending new one`);
                    const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                    channelConfig.messageId = sentMessage.id;
                    saveData({ channels });
                }
            } else {
                // No message ID, send new message
                const sentMessage = await channel.send({ embeds: result.embeds, files: result.files });
                channelConfig.messageId = sentMessage.id;
                saveData({ channels });
            }
        } catch (error) {
            console.error(`❌ Error updating channel ${channelConfig.channelId}:`, error.message);
        }
    }
    
    console.log(`✅ Forced update at ${new Date().toLocaleTimeString()}`);
}

/**
 * Start auto-updating server status embeds
 */
async function startAutoUpdate(client) {
    const updateStatus = async () => {
        try {
            const { channels } = getData();
            if (channels.length === 0) {
                console.log('⚠️ No channels configured for auto-update');
                return;
            }

            await forceUpdateAll(client);
        } catch (error) {
            console.error('❌ Error in auto-update:', error);
        }
    };

    // Initial update
    updateStatus();
    
    // Update every 5 minutes
    setInterval(updateStatus, 5 * 60 * 1000);
}

module.exports = {
    forceUpdateAll,
    startAutoUpdate
};
