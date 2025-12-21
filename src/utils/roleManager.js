const { getData } = require('./dataManager');

/**
 * Assign a Discord role based on rank
 * @param {Guild} guild - The Discord guild
 * @param {string} userId - The user ID
 * @param {string} rank - The rank (media, media+, admin)
 * @param {string} username - The username for logging
 */
async function assignRole(guild, userId, rank, username) {
    if (!guild) return;
    
    const { rankRoles } = getData();
    if (!rankRoles[rank]) return;

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(rankRoles[rank]);
        if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role);
            console.log(`✅ Assigned role ${role.name} to ${username}`);
        }
    } catch (error) {
        console.error(`❌ Failed to assign role to ${username}:`, error.message);
    }
}

/**
 * Remove a Discord role based on rank
 * @param {Guild} guild - The Discord guild
 * @param {string} userId - The user ID
 * @param {string} rank - The rank (media, media+, admin)
 * @param {string} username - The username for logging
 */
async function removeRole(guild, userId, rank, username) {
    if (!guild) return;
    
    const { rankRoles } = getData();
    if (!rankRoles[rank]) return;

    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const role = await guild.roles.fetch(rankRoles[rank]).catch(() => null);
            if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`✅ Removed role ${role.name} from ${username}`);
            }
        }
    } catch (error) {
        console.error(`❌ Failed to remove role from ${username}:`, error.message);
    }
}

/**
 * Update role when rank changes (remove old, add new)
 * @param {Guild} guild - The Discord guild
 * @param {string} userId - The user ID
 * @param {string} newRank - The new rank
 * @param {string} username - The username for logging
 */
async function updateRole(guild, userId, newRank, username) {
    if (!guild) return;
    
    const { rankRoles } = getData();
    const { getProfile } = require('../profiles');
    
    try {
        const member = await guild.members.fetch(userId);
        const oldProfile = getProfile(userId);
        
        // Remove old role if it exists and is different
        if (oldProfile && oldProfile.rank !== newRank && rankRoles[oldProfile.rank]) {
            const oldRole = await guild.roles.fetch(rankRoles[oldProfile.rank]).catch(() => null);
            if (oldRole && member.roles.cache.has(oldRole.id)) {
                await member.roles.remove(oldRole);
                console.log(`✅ Removed role ${oldRole.name} from ${username}`);
            }
        }
        
        // Add new role if configured
        if (rankRoles[newRank]) {
            const newRole = await guild.roles.fetch(rankRoles[newRank]).catch(() => null);
            if (newRole && !member.roles.cache.has(newRole.id)) {
                await member.roles.add(newRole);
                console.log(`✅ Assigned role ${newRole.name} to ${username}`);
            }
        }
    } catch (error) {
        console.error(`❌ Failed to update roles for ${username}:`, error.message);
    }
}

/**
 * Remove role from user across all guilds
 * @param {Client} client - The Discord client
 * @param {string} userId - The user ID
 * @param {string} rank - The rank
 * @param {string} username - The username for logging
 */
async function removeRoleFromAllGuilds(client, userId, rank, username) {
    const { rankRoles } = getData();
    if (!rankRoles[rank]) return;

    try {
        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                const role = await guild.roles.fetch(rankRoles[rank]).catch(() => null);
                if (role && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role);
                    console.log(`✅ Removed expired role ${role.name} from ${username} in ${guild.name}`);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Failed to remove expired role from ${username}:`, error.message);
    }
}

module.exports = {
    assignRole,
    removeRole,
    updateRole,
    removeRoleFromAllGuilds
};
