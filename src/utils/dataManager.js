const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../../data.json');

// Store channel configurations and peak players
let channels = [];
let peakPlayers = 0;
let rankRoles = {}; // Store role IDs for each rank
let logChannels = {
    publicLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null },
    mediaAnnouncements: { channelId: null },
    adminLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null }
};

/**
 * Load data from file
 */
function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            peakPlayers = data.peakPlayers || 0;
            rankRoles = data.rankRoles || {};
            logChannels = data.logChannels || {
                publicLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null },
                mediaAnnouncements: { channelId: null },
                adminLog: { channelId: null, mediaMessageId: null, mediaPlusMessageId: null }
            };
            // Migrate old statusMessages format to new channels format
            if (data.statusMessages && !data.channels) {
                channels = data.statusMessages.map(msg => ({
                    guildId: null,
                    channelId: msg.channelId,
                    messageId: msg.messageId
                }));
            } else {
                channels = data.channels || [];
            }
            console.log(`📊 Loaded data: Peak Players = ${peakPlayers}, Channels = ${channels.length}`);
        }
    } catch (error) {
        console.error('❌ Error loading data:', error.message);
    }
}

/**
 * Save data to file
 */
function saveData(data) {
    try {
        if (data) {
            // Update from provided data object
            if (data.peakPlayers !== undefined) peakPlayers = data.peakPlayers;
            if (data.channels !== undefined) channels = data.channels;
            if (data.rankRoles !== undefined) rankRoles = data.rankRoles;
            if (data.logChannels !== undefined) logChannels = data.logChannels;
        }
        
        const saveObj = {
            peakPlayers,
            channels,
            rankRoles,
            logChannels
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(saveObj, null, 2));
    } catch (error) {
        console.error('❌ Error saving data:', error.message);
    }
}

/**
 * Get all data
 */
function getData() {
    return {
        channels,
        peakPlayers,
        rankRoles,
        logChannels
    };
}

/**
 * Update specific data fields
 */
function updateData(updates) {
    if (updates.peakPlayers !== undefined) peakPlayers = updates.peakPlayers;
    if (updates.channels !== undefined) channels = updates.channels;
    if (updates.rankRoles !== undefined) rankRoles = updates.rankRoles;
    if (updates.logChannels !== undefined) logChannels = updates.logChannels;
    saveData();
}

module.exports = {
    loadData,
    saveData,
    getData,
    updateData
};
