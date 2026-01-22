/**
 * ============================================================================
 * SUGAR RUSH - TRAINING ACADEMY (RENDER READY)
 * ============================================================================
 */

require('dotenv').config();
const http = require('http'); // Built-in Web Server for Render

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType 
} = require('discord.js');

// ============================================================================
// [0] WEB SERVER (KEEPS BOT ALIVE ON RENDER)
// ============================================================================

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Sugar Rush Training Academy is Active! 🍩');
});

server.listen(port, () => {
    console.log(`🌐 Web Server listening on port ${port}`);
});

// ============================================================================
// [1] CONFIGURATION
// ============================================================================

const CONF_TOKEN = process.env.TRAINING_BOT_TOKEN; 

// --- 🔴 UPDATE THESE WITH YOUR REAL ROLE IDs ---
const ROLE_MANAGER = '1454876343878549630'; 
const ROLE_TEACHER = '1464013335367389318'; 

// MOCK MENU
const MOCK_MENU = [
    "Glazed Donut 🍩", "Strawberry Milkshake 🥤", "Choco Lava Cake 🍰", 
    "Blueberry Muffin 🧁", "Iced Latte ☕", "Rainbow Macaron 🍪"
];

const MOCK_IDS = ['ABC123', 'DEF456', 'GHI789'];

// COLORS
const COLOR_BRAND = 0xFFA500;   // Orange (Main)
const COLOR_SUCCESS = 0x2ECC71; // Green (Good job)
const COLOR_WAIT = 0x3498DB;    // Blue (Info/Waiting)

// ============================================================================
// [2] SESSION STORAGE
// ============================================================================

const trainingSessions = new Map();

// ============================================================================
// [3] HELPER FUNCTIONS
// ============================================================================

function createEmbed(title, description, color = COLOR_BRAND) {
    return new EmbedBuilder()
        .setTitle(`🍩 Sugar Rush Training: ${title}`)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: "Simulation Mode • Take your time and learn!" })
        .setTimestamp();
}

function generateOrderDetails() {
    return {
        item: MOCK_MENU[Math.floor(Math.random() * MOCK_MENU.length)],
        id: MOCK_IDS[Math.floor(Math.random() * MOCK_IDS.length)]
    };
}

function isInstructor(member) {
    return member.roles.cache.has(ROLE_MANAGER) || member.roles.cache.has(ROLE_TEACHER);
}

// ============================================================================
// [4] BOT LOGIC
// ============================================================================

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    try {
        // --- 1. START SESSION (Instructor Only) ---
        if (commandName === 'train') {
            if (!isInstructor(interaction.member)) {
                return interaction.reply({ 
                    content: "🚫 Sorry! Only Managers and Teachers can start training sessions.", 
                    ephemeral: true 
                });
            }

            const trainee = options.getUser('trainee');
            const mode = options.getString('mode');
            
            // Clear old session
            if (trainingSessions.has(trainee.id)) trainingSessions.delete(trainee.id);

            const details = generateOrderDetails();
            let startStep = 'claim'; 
            let instructions = "";
            let color = COLOR_BRAND;

            if (mode === 'delivery') {
                startStep = 'deliver'; 
                color = COLOR_WAIT;
                instructions = 
                    `**Hi ${trainee}! Welcome to Delivery Training! 🚚**\n\n` +
                    `A fresh order just finished in the kitchen:\n` +
                    `🍩 **Item:** ${details.item}\n` +
                    `🆔 **ID:** \`${details.id}\`\n\n` +
                    `**Your Goal:** Grab this order and get it to the customer!\n` +
                    `👉 **Type:** \`/deliver\` to start dispatch.`;
            } else {
                startStep = 'claim';
                color = COLOR_BRAND;
                instructions = 
                    `**Hi ${trainee}! Welcome to the Kitchen! 👨‍🍳**\n\n` +
                    `A new ticket just popped up on the screen:\n` +
                    `🍩 **Item:** ${details.item}\n` +
                    `🆔 **ID:** \`${details.id}\`\n\n` +
                    `**Your Goal:** Accept this order and make it delicious!\n` +
                    `👉 **Type:** \`/claim\` to accept the ticket.`;
            }

            trainingSessions.set(trainee.id, {
                manager_id: interaction.user.id,
                item: details.item,
                mode: mode,
                current_step: startStep,
                order_id: details.id
            });

            return interaction.reply({ 
                content: `${trainee} 👋 **Let's get started!**`,
                embeds: [createEmbed("Training Session Started", instructions, color)] 
            });
        }

        // --- TRAINEE ACTIONS ---

        const session = trainingSessions.get(interaction.user.id);
        
        if (!session && ['claim', 'cook', 'deliver'].includes(commandName)) {
            return interaction.reply({ 
                content: "🤔 You don't have a training session active right now. Ask a Manager or Teacher to start one for you!", 
                ephemeral: true 
            });
        }

        // --- 2. CLAIM ---
        if (commandName === 'claim') {
            if (session.current_step !== 'claim') return interaction.reply({ content: `🚫 Whoops! You can't do that yet. You need to **/${session.current_step}** first!`, ephemeral: true });

            session.current_step = 'cook';
            trainingSessions.set(interaction.user.id, session);

            return interaction.reply({ 
                embeds: [createEmbed("✅ Ticket Accepted!", 
                `Awesome! You've assigned the order (**${session.item}**) to yourself.\n\n` +
                `**Next Step:** It's time to bake! 🥐\n` +
                `👉 **Type:** \`/cook image:[attach_any_image]\``, COLOR_SUCCESS)]
            });
        }

        // --- 3. COOK ---
        if (commandName === 'cook') {
            if (session.current_step !== 'cook') return interaction.reply({ content: `🚫 Hold on! You can't cook right now. You need to **/${session.current_step}** first!`, ephemeral: true });

            await interaction.reply({ 
                embeds: [createEmbed("🔥 Cooking in progress...", `Mixing the ingredients for **${session.item}**... smells good! 😋\n*(Waiting 5 seconds...)*`, COLOR_BRAND)] 
            });

            setTimeout(async () => {
                if (session.mode === 'cook') {
                    // COMPLETE (Cook Only)
                    trainingSessions.delete(interaction.user.id);
                    await interaction.followUp({ 
                        content: `<@${session.manager_id}>`, 
                        embeds: [createEmbed("🎉 Cooking Training Passed!", 
                            `**Great job, <@${interaction.user.id}>!**\n` +
                            `You successfully claimed and cooked the order.\n\n` +
                            `👋 **Instructor:** They have completed the simulation. You can review their performance now.`, COLOR_SUCCESS)] 
                    });
                } else {
                    // MOVE TO DELIVERY (Full Cycle)
                    session.current_step = 'deliver';
                    trainingSessions.set(interaction.user.id, session);
                    await interaction.followUp({
                        content: `<@${interaction.user.id}>`,
                        embeds: [createEmbed("✅ Order Ready for Delivery!", 
                            `Ding! 🛎️ The **${session.item}** is fresh out of the oven.\n\n` +
                            `**⚠️ IMPORTANT REAL WORLD TIP:**\n` +
                            `When you run the next command, the bot will DM you proof images. **Always SAVE those images** to your phone or PC. You will need to upload them manually in the customer's channel later.\n\n` +
                            `**Your Goal:** Dispatch the order!\n` +
                            `👉 **Type:** \`/deliver\``, COLOR_WAIT)]
                    });
                }
            }, 5000);
            return;
        }

        // --- 4. DELIVER ---
        if (commandName === 'deliver') {
            if (session.current_step !== 'deliver') return interaction.reply({ content: `🚫 Not yet! The food isn't ready. You need to **/${session.current_step}** first!`, ephemeral: true });

            // Simulate DM
            try {
                await interaction.user.send({
                    embeds: [createEmbed("📦 [SIMULATION] Bot DM", 
                        `**Hey there! 👋 Here is the info for your delivery.**\n\n` +
                        `**1. Save the Proofs:** (In a real order, images would be attached here. Save them!)\n` +
                        `**2. Go to the Server:** \`discord.gg/simulated-server\`\n` +
                        `**3. Find the Channel:** Look for the customer <@${session.manager_id}>\n` +
                        `**4. Paste your Script:** "Hello! Here is your order..."\n` +
                        `**5. Upload Proofs:** Attach the images you saved.\n\n` +
                        `**✅ LAST STEP FOR TODAY:**\nGo back to the training channel and **send your Delivery Script** to the Instructor to finish up!`
                    )]
                });
            } catch (e) { console.log("DM Failed"); }

            const managerId = session.manager_id;
            trainingSessions.delete(interaction.user.id);

            return interaction.reply({ 
                content: `<@${managerId}>`, 
                embeds: [createEmbed("🚚 Delivery Simulation Complete!", 
                    `**Nice work, <@${interaction.user.id}>!** 🎉\n\n` +
                    `You have triggered the dispatch system. Check your DMs to see what the bot sent you.\n\n` +
                    `👇 **Instructor Action:**\n` +
                    `The trainee has been asked to paste their Delivery Script here. Once you verify it looks good, you can grant them the role!`, COLOR_SUCCESS)] 
            });
        }

    } catch (e) {
        console.error(e);
        if (!interaction.replied) interaction.reply({ content: "⚠️ Oops! The bot had a hiccup.", ephemeral: true });
    }
});

// ============================================================================
// [5] STARTUP
// ============================================================================

client.on('ready', async () => {
    console.log(`🎓 Friendly Trainer Online: ${client.user.tag}`);
    const commands = [
        { 
            name: 'train', 
            description: 'Start a training session (Manager/Teacher)', 
            options: [
                { name: 'trainee', type: 6, description: 'The user to train', required: true },
                { name: 'mode', type: 3, description: 'Training Track', required: true, choices: [
                    { name: '👨‍🍳 Cook (Claim -> Cook)', value: 'cook' },
                    { name: '🚚 Delivery (Deliver Only)', value: 'delivery' },
                    { name: '🚀 Full Cycle (Claim -> Cook -> Deliver)', value: 'full' }
                ]}
            ] 
        },
        { name: 'claim', description: 'Training: Claim current order' },
        { name: 'cook', description: 'Training: Cook current order', options: [{ name: 'image', type: 11, description: 'Proof', required: true }] },
        { name: 'deliver', description: 'Training: Deliver current order' }
    ];
    await client.application.commands.set(commands);
});

client.login(CONF_TOKEN);
