const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fetch = require('node-fetch');
const path = require('path');

/**
 * Fetch server status from mcstatus.io API
 * @param {string} address - Server address (e.g., "play.chocomc.in:19132")
 * @returns {Promise<object>} Server status data
 */
async function fetchServerStatus(address) {
    try {
        const response = await fetch(`https://api.mcstatus.io/v2/status/java/${address}`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Error fetching status for ${address}:`, error.message);
        return null;
    }
}

/**
 * Fetch server info including status and player count
 * @param {string} address - Server address
 * @returns {Promise<object>} Server info with status and player count
 */
async function fetchServerInfo(address) {
    try {
        const data = await fetchServerStatus(address);
        if (data && data.online && data.players) {
            return {
                online: true,
                players: data.players.online
            };
        }
        return {
            online: false,
            players: 0
        };
    } catch (error) {
        return {
            online: false,
            players: 0
        };
    }
}

/**
 * Create an embed for server status
 * @param {object} data - Server status data from API
 * @param {string} serverName - Custom server name
 * @param {number} peakPlayers - Peak number of players
 * @param {object} serverCounts - Individual server player counts
 * @returns {EmbedBuilder} Discord embed
 */
function createServerEmbed(data, serverName, peakPlayers = 0, serverCounts = {}) {
    const embed = new EmbedBuilder()
        .setColor(data.online ? '#00FF00' : '#FF0000')  // Green if online, Red if offline
        .setTitle('SERVER STATUS')
        .setTimestamp()
        .setFooter({ text: `Last Updated` });

    // Server Address
    embed.addFields({
        name: '🌐 Server Address',
        value: `**play.horizion.in**`,
        inline: false
    });

    // Status (fetched from API)
    embed.addFields({
        name: '📊 Status',
        value: data.online ? `🟢 **ONLINE!**` : `🔴 **OFFLINE!**`,
        inline: true
    });

    if (data.online) {

        // Version (hardcoded)
        embed.addFields({
            name: '🎮 Version',
            value: `**1.7.2 - 26.1.2**`,
            inline: false
        });

        // Players Online
        if (data.players) {
            embed.addFields({
                name: '👥 Players Online',
                value: `**${data.players.online}/${data.players.max}**`,
                inline: false
            });

            // Peak Players
            embed.addFields({
                name: '🏆 Peak Players',
                value: `**${peakPlayers}**`,
                inline: true
            });
        }

        // Servers section with status
        const survivalStatus = serverCounts.survival.online ? '🟢' : '🔴';
        const lifestealStatus = serverCounts.lifesteal.online ? '🟢' : '🔴';
        const pvpStatus = serverCounts.pvp.online ? '🟢' : '🔴';
        const survival2Status = serverCounts.survival2.online ? '🟢' : '🔴';
        const serversText = `${survivalStatus} **Survival:** ${serverCounts.survival.players} players\n${lifestealStatus} **Lifesteal:** ${serverCounts.lifesteal.players} players\n${pvpStatus} **PVP:** ${serverCounts.pvp.players} players\n${survival2Status} **Survival 2:** ${serverCounts.survival2.players} players`;
        embed.addFields({
            name: '🎮 Servers',
            value: serversText,
            inline: false
        });

        // Set logo as thumbnail and banner as image
        embed.setThumbnail('attachment://logo.png');
        embed.setImage('attachment://banner.png');

    }

    // Create attachments for logo and banner
    const logoPath = path.join(__dirname, '../images', 'logo.png');
    const bannerPath = path.join(__dirname, '../images', 'banner.png');
    
    const files = [
        new AttachmentBuilder(logoPath, { name: 'logo.png' }),
        new AttachmentBuilder(bannerPath, { name: 'banner.png' })
    ];

    return { embed, files };
}

/**
 * Create embeds for multiple servers
 * @param {string[]} addresses - Array of server addresses
 * @param {number} peakPlayers - Peak number of players
 * @param {string} survivalIp - Survival server IP
 * @param {string} lifestealIp - Lifesteal server IP
 * @param {string} pvpIp - PVP server IP
 * @param {string} survival2Ip - Survival 2 server IP
 * @returns {Promise<object>} Object with embeds and current online count
 */
async function createServerEmbeds(addresses, peakPlayers = 0, survivalIp = '', lifestealIp = '', pvpIp = '', survival2Ip = '') {
    const embeds = [];
    const files = [];
    let currentOnline = 0;
    
    // Fetch individual server info (status and player counts)
    const serverCounts = {
        survival: survivalIp ? await fetchServerInfo(survivalIp) : { online: false, players: 0 },
        lifesteal: lifestealIp ? await fetchServerInfo(lifestealIp) : { online: false, players: 0 },
        pvp: pvpIp ? await fetchServerInfo(pvpIp) : { online: false, players: 0 },
        survival2: survival2Ip ? await fetchServerInfo(survival2Ip) : { online: false, players: 0 }
    };
    
    for (const address of addresses) {
        const data = await fetchServerStatus(address);
        if (data) {
            const serverName = address.split(':')[0].toUpperCase();
            if (data.online && data.players) {
                currentOnline = data.players.online;
            }
            const result = createServerEmbed(data, serverName, peakPlayers, serverCounts);
            embeds.push(result.embed);
            if (result.files && result.files.length > 0) {
                files.push(...result.files);
            }
        }
    }
    
    return { embeds, files, currentOnline };
}

module.exports = {
    fetchServerStatus,
    fetchServerInfo,
    createServerEmbed,
    createServerEmbeds
};
