const fs = require('fs');
const path = require('path');

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Valid ranks
const VALID_RANKS = ['media', 'media+', 'admin'];

/**
 * Load profiles from data file
 * @returns {Array} Array of profiles
 */
function loadProfiles() {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            return data.profiles || [];
        }
        return [];
    } catch (error) {
        console.error('❌ Error loading profiles:', error.message);
        return [];
    }
}

/**
 * Save profiles to data file
 * @param {Array} profiles - Array of profiles to save
 */
function saveProfiles(profiles) {
    try {
        let data = {};
        
        // Load existing data to preserve other data
        if (fs.existsSync(dataFilePath)) {
            data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        }
        
        // Update profiles
        data.profiles = profiles;
        
        // Write back to file
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving profiles:', error.message);
        throw error;
    }
}

/**
 * Create a new profile
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {string} inGameName - In-game name
 * @param {string} rank - User rank (media, media+, admin)
 * @param {string} rankEndDate - Rank end date (optional)
 * @param {string} channelLink - YouTube/social media channel link (optional)
 * @returns {Object} Created profile or error
 */
function createProfile(userId, username, inGameName, rank, rankEndDate = null, channelLink = null) {
    try {
        // Validate rank
        if (!VALID_RANKS.includes(rank.toLowerCase())) {
            return {
                success: false,
                message: `❌ Invalid rank! Valid ranks are: ${VALID_RANKS.join(', ')}`
            };
        }

        const profiles = loadProfiles();
        
        // Check if profile already exists
        const existingProfile = profiles.find(p => p.userId === userId);
        if (existingProfile) {
            return {
                success: false,
                message: '❌ Profile already exists for this user! Use `/updateprofile` to update it.'
            };
        }

        // Create new profile
        const newProfile = {
            userId,
            username,
            inGameName,
            rank: rank.toLowerCase(),
            rankStartDate: new Date().toISOString(),
            rankEndDate: rankEndDate || null,
            channelLink: channelLink || null,
            notifications: { twoDays: false, oneDay: false, ended: false },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        profiles.push(newProfile);
        saveProfiles(profiles);

        return {
            success: true,
            message: `✅ Profile created successfully for ${username}!`,
            profile: newProfile
        };
    } catch (error) {
        console.error('❌ Error creating profile:', error);
        return {
            success: false,
            message: '❌ Failed to create profile. Please try again.'
        };
    }
}

/**
 * Update an existing profile
 * @param {string} userId - Discord user ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Object} Update result
 */
function updateProfile(userId, updates) {
    try {
        const profiles = loadProfiles();
        const profileIndex = profiles.findIndex(p => p.userId === userId);

        if (profileIndex === -1) {
            return {
                success: false,
                message: '❌ Profile not found! Use `/createprofile` to create one first.'
            };
        }

        // Validate rank if being updated
        if (updates.rank && !VALID_RANKS.includes(updates.rank.toLowerCase())) {
            return {
                success: false,
                message: `❌ Invalid rank! Valid ranks are: ${VALID_RANKS.join(', ')}`
            };
        }

        // Update profile
        const profile = profiles[profileIndex];
        
        if (updates.username) profile.username = updates.username;
        if (updates.inGameName) profile.inGameName = updates.inGameName;
        if (updates.rank) profile.rank = updates.rank.toLowerCase();
        if (updates.rankEndDate !== undefined) {
            profile.rankEndDate = updates.rankEndDate;
            // Reset notifications when end date changes
            profile.notifications = { twoDays: false, oneDay: false, ended: false };
        }
        if (updates.rankStartDate !== undefined) profile.rankStartDate = updates.rankStartDate;
        if (updates.channelLink !== undefined) profile.channelLink = updates.channelLink;
        
        profile.updatedAt = new Date().toISOString();
        
        profiles[profileIndex] = profile;
        saveProfiles(profiles);

        return {
            success: true,
            message: `✅ Profile updated successfully for ${profile.username}!`,
            profile: profile
        };
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        return {
            success: false,
            message: '❌ Failed to update profile. Please try again.'
        };
    }
}

/**
 * Delete a profile
 * @param {string} userId - Discord user ID
 * @returns {Object} Delete result
 */
function deleteProfile(userId) {
    try {
        const profiles = loadProfiles();
        const profileIndex = profiles.findIndex(p => p.userId === userId);

        if (profileIndex === -1) {
            return {
                success: false,
                message: '❌ Profile not found!'
            };
        }

        const deletedProfile = profiles[profileIndex];
        profiles.splice(profileIndex, 1);
        saveProfiles(profiles);

        return {
            success: true,
            message: `✅ Profile deleted successfully for ${deletedProfile.username}!`,
            profile: deletedProfile
        };
    } catch (error) {
        console.error('❌ Error deleting profile:', error);
        return {
            success: false,
            message: '❌ Failed to delete profile. Please try again.'
        };
    }
}

/**
 * Get a profile by user ID
 * @param {string} userId - Discord user ID
 * @returns {Object|null} Profile or null if not found
 */
function getProfile(userId) {
    const profiles = loadProfiles();
    return profiles.find(p => p.userId === userId) || null;
}

/**
 * Get all profiles
 * @returns {Array} Array of all profiles
 */
function getAllProfiles() {
    return loadProfiles();
}

/**
 * Format a profile for display
 * @param {Object} profile - Profile object
 * @returns {Object} Formatted embed object
 */
function formatProfileEmbed(profile) {
    const startDate = new Date(profile.rankStartDate);
    const formattedStartDate = startDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let endDateText = 'Permanent';
    if (profile.rankEndDate) {
        const endDate = new Date(profile.rankEndDate);
        endDateText = endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const rankEmoji = {
        'media': '📹',
        'media+': '🎬',
        'admin': '⚡'
    };

    const fields = [
        {
            name: '👤 Username',
            value: profile.username,
            inline: true
        },
        {
            name: '🎮 In-Game Name',
            value: profile.inGameName,
            inline: true
        },
        {
            name: '🏆 Rank',
            value: profile.rank.toUpperCase(),
            inline: true
        },
        {
            name: '📅 Rank Start Date',
            value: formattedStartDate,
            inline: false
        },
        {
            name: '📅 Rank End Date',
            value: endDateText,
            inline: false
        }
    ];

    // Add channel link if available
    if (profile.channelLink) {
        fields.push({
            name: '🔗 Channel Link',
            value: profile.channelLink,
            inline: false
        });
    }

    return {
        color: profile.rank === 'admin' ? 0xff0000 : profile.rank === 'media+' ? 0x00ff00 : 0x0099ff,
        title: `${rankEmoji[profile.rank] || '📋'} Profile: ${profile.username}`,
        fields: fields,
        footer: {
            text: `Profile ID: ${profile.userId}`
        },
        timestamp: new Date(profile.updatedAt)
    };
}

module.exports = {
    createProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    getAllProfiles,
    formatProfileEmbed,
    saveProfiles,
    VALID_RANKS
};
