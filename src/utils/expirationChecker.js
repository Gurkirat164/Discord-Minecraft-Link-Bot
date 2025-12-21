const { getAllProfiles, saveProfiles } = require('../profiles');
const { getData } = require('./dataManager');
const { removeRoleFromAllGuilds } = require('./roleManager');
const { updatePublicLog, updateAdminLog } = require('./logUpdater');

/**
 * Start checking for rank expirations and send notifications
 */
async function startRankExpirationChecker(client) {
    const checkExpirations = async () => {
        try {
            const profiles = getAllProfiles();
            const now = new Date();
            const { logChannels } = getData();
            let profilesUpdated = false;

            for (const profile of profiles) {
                // Skip if no end date (permanent rank)
                if (!profile.rankEndDate) continue;

                const endDate = new Date(profile.rankEndDate);
                const timeDiff = endDate - now;
                const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                // Initialize notifications object if it doesn't exist (for backward compatibility)
                if (!profile.notifications) {
                    profile.notifications = { twoDays: false, oneDay: false, ended: false };
                    profilesUpdated = true;
                }

                try {
                    const user = await client.users.fetch(profile.userId).catch(() => null);
                    if (!user) continue;

                    // Rank has ended
                    if (timeDiff <= 0 && !profile.notifications.ended) {
                        const embed = {
                            color: 0xff0000,
                            title: '⏰ Rank Expired',
                            description: `Your **${profile.rank.toUpperCase()}** rank has expired!`,
                            fields: [
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
                                    name: '📅 Expired On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }),
                                    inline: false
                                }
                            ],
                            footer: {
                                text: 'Contact an admin if you need to renew your rank'
                            },
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.ended = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent expiration notification to ${profile.username}`);
                        
                        // Send DM to owner about the expired rank
                        if (process.env.OWNER_ID) {
                            try {
                                const owner = await client.users.fetch(process.env.OWNER_ID);
                                const ownerEmbed = {
                                    color: 0xff0000,
                                    title: '🚨 Rank Expired - Owner Notification',
                                    description: `A user's rank has expired and requires attention.`,
                                    fields: [
                                        {
                                            name: '👤 User',
                                            value: `<@${profile.userId}> (${profile.username})`,
                                            inline: true
                                        },
                                        {
                                            name: '🎮 In-Game Name',
                                            value: profile.inGameName,
                                            inline: true
                                        },
                                        {
                                            name: '🏆 Expired Rank',
                                            value: profile.rank.toUpperCase(),
                                            inline: true
                                        },
                                        {
                                            name: '📅 Expired On',
                                            value: endDate.toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            }),
                                            inline: false
                                        },
                                        {
                                            name: '🔗 Channel Link',
                                            value: profile.channelLink || 'N/A',
                                            inline: false
                                        },
                                        {
                                            name: '📋 Started On',
                                            value: new Date(profile.rankStartDate).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            }),
                                            inline: false
                                        }
                                    ],
                                    footer: {
                                        text: 'User ID: ' + profile.userId
                                    },
                                    timestamp: new Date()
                                };
                                await owner.send({ embeds: [ownerEmbed] });
                                console.log(`📧 Sent expiration notification to owner for ${profile.username}`);
                            } catch (ownerDmError) {
                                console.error(`❌ Could not DM owner about expired rank:`, ownerDmError.message);
                            }
                        }
                        
                        // Remove Discord role when rank expires
                        await removeRoleFromAllGuilds(client, profile.userId, profile.rank, profile.username);
                    }
                    // 1 day before expiration
                    else if (daysLeft === 1 && !profile.notifications.oneDay) {
                        const embed = {
                            color: 0xff9900,
                            title: '⚠️ Rank Expiring Soon',
                            description: `Your **${profile.rank.toUpperCase()}** rank will end in **1 day**!`,
                            fields: [
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
                                    name: '📅 Expires On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                    inline: false
                                },
                                {
                                    name: '⏰ Action Required',
                                    value: 'Upload and verify your video with admins in the next **1 day** to maintain your rank!',
                                    inline: false
                                }
                            ],
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.oneDay = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent 1-day notification to ${profile.username}`);
                        
                        // Post to media announcements channel
                        if (logChannels.mediaAnnouncements.channelId) {
                            try {
                                const announcementChannel = await client.channels.fetch(logChannels.mediaAnnouncements.channelId);
                                await announcementChannel.send({ content: `<@${profile.userId}>`, embeds: [embed] });
                            } catch (error) {
                                console.error('❌ Error posting to media announcements:', error.message);
                            }
                        }
                    }
                    // 2 days before expiration
                    else if (daysLeft === 2 && !profile.notifications.twoDays) {
                        const embed = {
                            color: 0xffcc00,
                            title: '⚠️ Rank Expiring Soon',
                            description: `Your **${profile.rank.toUpperCase()}** rank will end in **2 days**!`,
                            fields: [
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
                                    name: '📅 Expires On',
                                    value: endDate.toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                    inline: false
                                },
                                {
                                    name: '⏰ Action Required',
                                    value: 'Upload and verify your video with admins in the next **2 days** to maintain your rank!',
                                    inline: false
                                }
                            ],
                            timestamp: new Date()
                        };
                        await user.send({ embeds: [embed] });
                        profile.notifications.twoDays = true;
                        profilesUpdated = true;
                        console.log(`📧 Sent 2-day notification to ${profile.username}`);
                        
                        // Post to media announcements channel
                        if (logChannels.mediaAnnouncements.channelId) {
                            try {
                                const announcementChannel = await client.channels.fetch(logChannels.mediaAnnouncements.channelId);
                                await announcementChannel.send({ content: `<@${profile.userId}>`, embeds: [embed] });
                            } catch (error) {
                                console.error('❌ Error posting to media announcements:', error.message);
                            }
                        }
                    }
                } catch (dmError) {
                    console.log(`❌ Could not DM user ${profile.username}:`, dmError.message);
                }
            }

            // Save updated profiles with notification status only if there were changes
            if (profilesUpdated) {
                saveProfiles(profiles);
                console.log(`💾 Saved notification status for profiles`);
                
                // Update log channels when profiles change
                await updatePublicLog(client);
                await updateAdminLog(client);
            }
        } catch (error) {
            console.error('❌ Error checking rank expirations:', error);
        }
    };

    // Check immediately on start
    checkExpirations();
    
    // Check every hour (3600000 ms)
    setInterval(checkExpirations, 60 * 60 * 1000);
}

module.exports = {
    startRankExpirationChecker
};
