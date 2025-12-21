const { getAllProfiles } = require('../profiles');
const { getData, saveData } = require('./dataManager');

/**
 * Update the public log with member lists
 */
async function updatePublicLog(client) {
    const { logChannels } = getData();
    if (!logChannels.publicLog.channelId) return;
    
    try {
        const channel = await client.channels.fetch(logChannels.publicLog.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        
        const profiles = getAllProfiles();
        const now = new Date();
        const mediaProfiles = profiles.filter(p => p.rank === 'media' && (!p.rankEndDate || new Date(p.rankEndDate) > now));
        const mediaPlusProfiles = profiles.filter(p => p.rank === 'media+' && (!p.rankEndDate || new Date(p.rankEndDate) > now));
        
        // Media embed
        const mediaList = mediaProfiles.length > 0 
            ? mediaProfiles.map(p => `• **${p.username}** - \`${p.inGameName}\``).join('\n')
            : '*No active members*';
        
        const mediaEmbed = {
            color: 0x0099ff,
            title: '📹 Media Members',
            description: mediaList,
            footer: {
                text: `Active Media: ${mediaProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Media+ embed
        const mediaPlusList = mediaPlusProfiles.length > 0
            ? mediaPlusProfiles.map(p => `• **${p.username}** - \`${p.inGameName}\``).join('\n')
            : '*No active members*';
        
        const mediaPlusEmbed = {
            color: 0x00ff00,
            title: '🎬 Media+ Members',
            description: mediaPlusList,
            footer: {
                text: `Active Media+: ${mediaPlusProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Update or send media embed
        if (logChannels.publicLog.mediaMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.publicLog.mediaMessageId);
                await message.edit({ embeds: [mediaEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaEmbed] });
                logChannels.publicLog.mediaMessageId = sentMessage.id;
                saveData({ logChannels });
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaEmbed] });
            logChannels.publicLog.mediaMessageId = sentMessage.id;
            saveData({ logChannels });
        }
        
        // Update or send media+ embed
        if (logChannels.publicLog.mediaPlusMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.publicLog.mediaPlusMessageId);
                await message.edit({ embeds: [mediaPlusEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
                logChannels.publicLog.mediaPlusMessageId = sentMessage.id;
                saveData({ logChannels });
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
            logChannels.publicLog.mediaPlusMessageId = sentMessage.id;
            saveData({ logChannels });
        }
    } catch (error) {
        console.error('❌ Error updating public log:', error.message);
    }
}

/**
 * Update the admin log with expiration tracking
 */
async function updateAdminLog(client) {
    const { logChannels } = getData();
    if (!logChannels.adminLog.channelId) return;
    
    try {
        const channel = await client.channels.fetch(logChannels.adminLog.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        
        const profiles = getAllProfiles();
        const now = new Date();
        
        const mediaProfiles = profiles.filter(p => p.rank === 'media' && p.rankEndDate && new Date(p.rankEndDate) > now);
        const mediaPlusProfiles = profiles.filter(p => p.rank === 'media+' && p.rankEndDate && new Date(p.rankEndDate) > now);
        
        // Media embed
        const mediaList = mediaProfiles.length > 0
            ? mediaProfiles.map(p => {
                const daysLeft = Math.ceil((new Date(p.rankEndDate) - now) / (1000 * 60 * 60 * 24));
                return `• <@${p.userId}> - Expires in **${daysLeft} day${daysLeft !== 1 ? 's' : ''}**`;
            }).join('\n')
            : '*No active members*';
        
        const mediaEmbed = {
            color: 0x0099ff,
            title: '📹 Media Rank Tracking',
            description: mediaList,
            footer: {
                text: `Active Media: ${mediaProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Media+ embed
        const mediaPlusList = mediaPlusProfiles.length > 0
            ? mediaPlusProfiles.map(p => {
                const daysLeft = Math.ceil((new Date(p.rankEndDate) - now) / (1000 * 60 * 60 * 24));
                return `• <@${p.userId}> - Expires in **${daysLeft} day${daysLeft !== 1 ? 's' : ''}**`;
            }).join('\n')
            : '*No active members*';
        
        const mediaPlusEmbed = {
            color: 0x00ff00,
            title: '🎬 Media+ Rank Tracking',
            description: mediaPlusList,
            footer: {
                text: `Active Media+: ${mediaPlusProfiles.length}`
            },
            timestamp: new Date()
        };
        
        // Update or send media embed
        if (logChannels.adminLog.mediaMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.adminLog.mediaMessageId);
                await message.edit({ embeds: [mediaEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaEmbed] });
                logChannels.adminLog.mediaMessageId = sentMessage.id;
                saveData({ logChannels });
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaEmbed] });
            logChannels.adminLog.mediaMessageId = sentMessage.id;
            saveData({ logChannels });
        }
        
        // Update or send media+ embed
        if (logChannels.adminLog.mediaPlusMessageId) {
            try {
                const message = await channel.messages.fetch(logChannels.adminLog.mediaPlusMessageId);
                await message.edit({ embeds: [mediaPlusEmbed] });
            } catch {
                const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
                logChannels.adminLog.mediaPlusMessageId = sentMessage.id;
                saveData({ logChannels });
            }
        } else {
            const sentMessage = await channel.send({ embeds: [mediaPlusEmbed] });
            logChannels.adminLog.mediaPlusMessageId = sentMessage.id;
            saveData({ logChannels });
        }
    } catch (error) {
        console.error('❌ Error updating admin log:', error.message);
    }
}

/**
 * Start periodic admin log updates
 */
async function startAdminLogUpdater(client) {
    const updateLogs = async () => {
        try {
            await updateAdminLog(client);
        } catch (error) {
            console.error('❌ Error in admin log updater:', error);
        }
    };
    
    // Update immediately on start
    updateLogs();
    
    // Update every 30 minutes
    setInterval(updateLogs, 30 * 60 * 1000);
}

module.exports = {
    updatePublicLog,
    updateAdminLog,
    startAdminLogUpdater
};
