/**
 * Generate help embed with all available commands
 * @returns {Object} Help embed object
 */
function getHelpEmbed() {
    return {
        color: 0x5865F2,
        title: '📚 Bot Commands Help',
        description: 'Here are all the available commands for this bot:',
        fields: [
            {
                name: '🏓 General Commands',
                value: '`/ping` - Check bot latency and response time\n`/help` - Display this help menu',
                inline: false
            },
            {
                name: '🎮 Minecraft Server Commands',
                value: '`/mcstatus` - Get current Minecraft server status\n`/update` - Force update server status immediately\n`/set type:statuschannel` - Set current channel for auto-updating server status',
                inline: false
            },
            {
                name: '👥 Profile Commands',
                value: '`/viewprofile [user]` - View a user\'s profile (leave empty to view your own)\n`/listprofiles` - Display all user profiles',
                inline: false
            },
            {
                name: '⚡ Admin Only Commands',
                value: '`/createprofile` - Create a new user profile\n`/updateprofile` - Update an existing user profile\n`/deleteprofile` - Delete a user profile\n`/set` - Configure bot settings (roles, channels, logs)\n`/unset` - Remove bot configurations',
                inline: false
            }
        ],
        footer: {
            text: 'Use the commands to interact with the bot'
        },
        timestamp: new Date()
    };
}

/**
 * Generate detailed command information
 * @param {string} commandName - Name of the command to get details for
 * @returns {Object|null} Command details embed or null if not found
 */
function getCommandDetails(commandName) {
    const commands = {
        'ping': {
            name: '🏓 Ping',
            description: 'Test the bot\'s responsiveness and check latency',
            usage: '/ping',
            permissions: 'Administrator',
            examples: ['`/ping`']
        },
        'help': {
            name: '📚 Help',
            description: 'Display all available commands and their usage',
            usage: '/help',
            permissions: 'Everyone',
            examples: ['`/help`']
        },
        'mcstatus': {
            name: '🎮 MC Status',
            description: 'Fetch and display current Minecraft server status including player count and server information',
            usage: '/mcstatus',
            permissions: 'Administrator',
            examples: ['`/mcstatus`']
        },
        'update': {
            name: '🔄 Update',
            description: 'Force an immediate update of server status in all configured channels',
            usage: '/update',
            permissions: 'Administrator',
            examples: ['`/update`']
        },
        'setchannel': {
            name: '📺 Set Channel',
            description: 'Configure the current channel to receive automatic server status updates every 5 minutes',
            usage: '/setchannel',
            permissions: 'Administrator',
            examples: ['`/setchannel`']
        },
        'createprofile': {
            name: '➕ Create Profile',
            description: 'Create a new user profile with rank, in-game name, and channel link',
            usage: '/createprofile <user> <ingamename> <rank> [channellink] [enddate]',
            permissions: 'Administrator',
            examples: [
                '`/createprofile @User MinecraftName media` - Creates profile with 5 days duration',
                '`/createprofile @User MinecraftName media+ https://youtube.com/channel 30` - With channel and 30 days',
                '`/createprofile @User MinecraftName admin 0` - Permanent admin rank'
            ],
            notes: [
                '• Valid ranks: `media`, `media+`, `admin`',
                '• Default duration: 5 days (if not specified)',
                '• Set enddate to `0` for permanent rank',
                '• Channel link is optional'
            ]
        },
        'updateprofile': {
            name: '✏️ Update Profile',
            description: 'Update an existing user profile information',
            usage: '/updateprofile <user> [ingamename] [rank] [channellink] [adddays] [extenddays] [setdays]',
            permissions: 'Administrator',
            examples: [
                '`/updateprofile @User NewName` - Update in-game name',
                '`/updateprofile @User rank:media+` - Update rank',
                '`/updateprofile @User adddays:7` - Add 7 days to existing end date',
                '`/updateprofile @User extenddays:10` - Extend rank 10 days from today',
                '`/updateprofile @User setdays:30` - Set new 30-day period from today (resets start date)',
                '`/updateprofile @User setdays:0` - Make rank permanent',
                '`/updateprofile @User channellink:remove` - Remove channel link'
            ],
            notes: [
                '• At least one field must be updated',
                '• `adddays` adds to existing end date',
                '• `extenddays` extends from current date',
                '• `setdays` creates new period from today and resets start date',
                '• Set to `0` for permanent rank',
                '• Type `remove` to clear channel link'
            ]
        },
        'deleteprofile': {
            name: '🗑️ Delete Profile',
            description: 'Permanently delete a user profile from the system',
            usage: '/deleteprofile <user>',
            permissions: 'Administrator',
            examples: ['`/deleteprofile @User`'],
            notes: ['• This action cannot be undone']
        },
        'viewprofile': {
            name: '👤 View Profile',
            description: 'Display detailed information about a user profile',
            usage: '/viewprofile [user]',
            permissions: 'Everyone',
            examples: [
                '`/viewprofile` - View your own profile',
                '`/viewprofile @User` - View another user\'s profile'
            ]
        },
        'listprofiles': {
            name: '📋 List Profiles',
            description: 'Display a list of all user profiles in the system',
            usage: '/listprofiles',
            permissions: 'Everyone',
            examples: ['`/listprofiles`']
        },
        'set': {
            name: '⚙️ Set Configuration',
            description: 'Configure bot settings including roles, channels, and log channels',
            usage: '/set <type> [channel] [role]',
            permissions: 'Administrator',
            examples: [
                '`/set type:publiclog channel:#members` - Set public member list log channel',
                '`/set type:mediaannouncements channel:#announcements` - Set media announcements channel',
                '`/set type:adminlog channel:#admin` - Set admin log channel',
                '`/set type:statuschannel` - Set current channel for server status updates',
                '`/set type:mediarole role:@Media` - Assign role for media rank',
                '`/set type:mediaplusrole role:@Media+` - Assign role for media+ rank'
            ],
            notes: [
                '• Available types: `publiclog`, `mediaannouncements`, `adminlog`, `statuschannel`, `mediarole`, `mediaplusrole`',
                '• Channel parameter required for log types and statuschannel',
                '• Role parameter required for role types'
            ]
        },
        'unset': {
            name: '🔧 Unset Configuration',
            description: 'Remove bot configuration settings',
            usage: '/unset <type>',
            permissions: 'Administrator',
            examples: [
                '`/unset type:mediarole` - Remove media role assignment',
                '`/unset type:mediaplusrole` - Remove media+ role assignment'
            ],
            notes: [
                '• Available types: `mediarole`, `mediaplusrole`',
                '• Use this to stop automatic role assignment'
            ]
        }
    };

    const command = commands[commandName.toLowerCase()];
    if (!command) return null;

    const embed = {
        color: 0x5865F2,
        title: command.name,
        description: command.description,
        fields: [
            {
                name: '📝 Usage',
                value: command.usage,
                inline: false
            },
            {
                name: '🔐 Permissions',
                value: command.permissions,
                inline: true
            }
        ],
        footer: {
            text: 'Parameters in <> are required, [] are optional'
        },
        timestamp: new Date()
    };

    if (command.examples && command.examples.length > 0) {
        embed.fields.push({
            name: '💡 Examples',
            value: command.examples.join('\n'),
            inline: false
        });
    }

    if (command.notes && command.notes.length > 0) {
        embed.fields.push({
            name: '📌 Notes',
            value: command.notes.join('\n'),
            inline: false
        });
    }

    return embed;
}

module.exports = {
    getHelpEmbed,
    getCommandDetails
};
