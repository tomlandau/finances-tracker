/**
 * Test script to verify Telegram bot connectivity
 * Run with: npx tsx scripts/test-telegram.ts
 */

import { config } from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

// Load environment
config({ path: '.env.local' });

async function testTelegramConnection() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const tomChatId = process.env.TELEGRAM_CHAT_ID_TOM;
  const yaelChatId = process.env.TELEGRAM_CHAT_ID_YAEL;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local');
    process.exit(1);
  }

  console.log('🤖 Testing Telegram bot connection...\n');
  console.log(`Bot token: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);
  console.log(`Tom chat ID: ${tomChatId}`);
  console.log(`Yael chat ID: ${yaelChatId}\n`);

  const bot = new TelegramBot(token, { polling: false });

  // Test 1: Get bot info
  console.log('📡 Test 1: Getting bot info...');
  try {
    const botInfo = await bot.getMe();
    console.log('✅ Bot is active:');
    console.log(`   Name: ${botInfo.first_name}`);
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}\n`);
  } catch (error: any) {
    console.error('❌ Failed to get bot info:', error.message);
    process.exit(1);
  }

  // Test 2: Get recent updates
  console.log('📡 Test 2: Getting recent updates (to find correct chat IDs)...');
  try {
    const updates = await bot.getUpdates({ limit: 10 });
    console.log(`✅ Found ${updates.length} recent updates\n`);

    if (updates.length === 0) {
      console.log('⚠️  No recent messages found. To get your chat ID:');
      console.log('   1. Send a message to your bot on Telegram');
      console.log('   2. Run this script again\n');
    } else {
      console.log('📝 Recent chat IDs from updates:');
      const chatIds = new Set<number>();
      updates.forEach((update, index) => {
        const chatId = update.message?.chat?.id;
        const firstName = update.message?.chat?.first_name;
        const username = update.message?.chat?.username;
        if (chatId) {
          chatIds.add(chatId);
          console.log(`   Update ${index + 1}: Chat ID ${chatId} - ${firstName || 'No name'} ${username ? `(@${username})` : ''}`);
        }
      });
      console.log(`\n✅ Unique chat IDs found: ${Array.from(chatIds).join(', ')}\n`);
    }
  } catch (error: any) {
    console.error('❌ Failed to get updates:', error.message);
  }

  // Test 3: Test Tom's chat ID
  if (tomChatId) {
    console.log(`📡 Test 3: Testing Tom's chat ID (${tomChatId})...`);
    try {
      const chatInfo = await bot.getChat(tomChatId);
      console.log('✅ Tom\'s chat is accessible:');
      console.log(`   Type: ${chatInfo.type}`);
      console.log(`   First name: ${chatInfo.first_name || 'N/A'}`);
      console.log(`   Username: ${chatInfo.username ? `@${chatInfo.username}` : 'N/A'}\n`);

      // Try to send a test message
      console.log('📤 Sending test message to Tom...');
      await bot.sendMessage(tomChatId, '🧪 Test message from Telegram connection script');
      console.log('✅ Test message sent successfully!\n');
    } catch (error: any) {
      console.error(`❌ Failed to access Tom's chat (${tomChatId}):`, error.message);
      console.error('   Possible reasons:');
      console.error('   1. The chat ID is incorrect');
      console.error('   2. The bot was blocked by the user');
      console.error('   3. The user needs to start a conversation with the bot first\n');
    }
  }

  // Test 4: Test Yael's chat ID
  if (yaelChatId) {
    console.log(`📡 Test 4: Testing Yael's chat ID (${yaelChatId})...`);
    try {
      const chatInfo = await bot.getChat(yaelChatId);
      console.log('✅ Yael\'s chat is accessible:');
      console.log(`   Type: ${chatInfo.type}`);
      console.log(`   First name: ${chatInfo.first_name || 'N/A'}`);
      console.log(`   Username: ${chatInfo.username ? `@${chatInfo.username}` : 'N/A'}\n`);

      // Try to send a test message
      console.log('📤 Sending test message to Yael...');
      await bot.sendMessage(yaelChatId, '🧪 Test message from Telegram connection script');
      console.log('✅ Test message sent successfully!\n');
    } catch (error: any) {
      console.error(`❌ Failed to access Yael's chat (${yaelChatId}):`, error.message);
      console.error('   Possible reasons:');
      console.error('   1. The chat ID is incorrect');
      console.error('   2. The bot was blocked by the user');
      console.error('   3. The user needs to start a conversation with the bot first\n');
    }
  }

  console.log('✅ Tests complete!');
}

testTelegramConnection().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
