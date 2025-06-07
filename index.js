import express from 'express'
import fetch from 'node-fetch'

const app = express()
app.use(express.json())

const TOKEN = '7514098747:AAG7S1YO2g4HDnsHDz3vCzxCrOtEmvwsIZg'
const API_URL = `https://api.telegram.org/bot${TOKEN}`

const notifyJoin = true
const notifyLeave = true
const notifyBotJoinLeave = true

let botId = null

async function getBotId() {
  if (botId) return botId
  const res = await fetch(`${API_URL}/getMe`)
  const data = await res.json()
  if (data.ok) {
    botId = data.result.id
    return botId
  }
  return null
}

async function sendMessage(chat_id, text, reply_to_message_id = null, reply_markup = null) {
  const payload = { chat_id, text, parse_mode: 'HTML' }
  if (reply_to_message_id) payload.reply_to_message_id = reply_to_message_id
  if (reply_markup) payload.reply_markup = reply_markup
  await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

async function deleteMessage(chat_id, message_id) {
  await fetch(`${API_URL}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, message_id })
  })
}

async function getAdmins(chat_id) {
  const res = await fetch(`${API_URL}/getChatAdministrators?chat_id=${chat_id}`)
  const data = await res.json()
  if (data.ok) return data.result
  return []
}

async function getMemberCount(chat_id) {
  const res = await fetch(`${API_URL}/getChatMembersCount?chat_id=${chat_id}`)
  const data = await res.json()
  if (data.ok) return data.result
  return 0
}

async function notifyAdmins(chat_id, message) {
  const admins = await getAdmins(chat_id)
  for (const admin of admins) {
    await sendMessage(admin.user.id, message)
  }
}

app.post('/', async (req, res) => {
  const body = req.body

  if (body.message) {
    const msg = body.message
    const chat_id = msg.chat.id
    const text = msg.text
    const message_id = msg.message_id

    if (text === '/start') {
      const botInfo = await (await fetch(`${API_URL}/getMe`)).json()
      const botUsername = botInfo.result.username
      await sendMessage(chat_id, `👋 <b>Welcome to the bot!</b>`, message_id, {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: `https://t.me/${botUsername}?startgroup=true` }],
          [{ text: '📢 Join Channel', url: 'https://t.me/YOUR_CHANNEL_USERNAME' }]
        ]
      })
    }

    if (text === '/checkbot') {
      const id = await getBotId()
      const res2 = await fetch(`${API_URL}/getChatMember?chat_id=${chat_id}&user_id=${id}`)
      const data2 = await res2.json()
      if (!data2.ok || ['left', 'kicked'].includes(data2.result.status)) {
        await sendMessage(chat_id, '❌ <b>Bot is not a member of this chat or has been removed.</b>', message_id)
      } else {
        await sendMessage(chat_id, `✅ <b>Bot is currently a member of this chat.</b>\nStatus: <code>${data2.result.status}</code>`, message_id)
      }
    }

    if (msg.new_chat_members || msg.left_chat_member) {
      await deleteMessage(chat_id, message_id)
    }
  }

  if (body.my_chat_member || body.chat_member) {
    const data = body.my_chat_member || body.chat_member
    const chat = data.chat
    const oldStatus = data.old_chat_member.status
    const newStatus = data.new_chat_member.status
    const user = data.new_chat_member.user

    const id = await getBotId()
    const memberCount = await getMemberCount(chat.id)

    if (user.id === id) {
      if (notifyBotJoinLeave) {
        if (newStatus === 'member' && (oldStatus === 'left' || oldStatus === 'kicked')) {
          await notifyAdmins(chat.id, `
🤖 <b>Bot Added to Chat</b>

📢 <b>Chat:</b> ${chat.title}
🆔 <b>Chat ID:</b> <code>${chat.id}</code>
📚 <b>Type:</b> ${chat.type}
👥 <b>Total Members:</b> ${memberCount}
          `.trim())
        }

        if ((newStatus === 'left' || newStatus === 'kicked') && (oldStatus === 'member' || oldStatus === 'administrator' || oldStatus === 'creator')) {
          await notifyAdmins(chat.id, `
⚠️ <b>Bot Removed from Chat</b>

📢 <b>Chat:</b> ${chat.title}
🆔 <b>Chat ID:</b> <code>${chat.id}</code>
📚 <b>Type:</b> ${chat.type}
👥 <b>Total Members:</b> ${memberCount}
          `.trim())
        }
      }
    } else {
      if (notifyJoin && newStatus === 'member' && (oldStatus === 'left' || oldStatus === 'kicked')) {
        await notifyAdmins(chat.id, `
✅ <b>User Joined</b>

👤 <b>User:</b> ${user.first_name || ''} ${user.last_name || ''}
🔗 <b>Username:</b> @${user.username || 'N/A'}
🆔 <b>User ID:</b> <code>${user.id}</code>

📢 <b>Group:</b> ${chat.title}
🆔 <b>Chat ID:</b> <code>${chat.id}</code>
📚 <b>Type:</b> ${chat.type}
👥 <b>Total Members:</b> ${memberCount}
        `.trim())
      }
      if (notifyLeave && (newStatus === 'left' || newStatus === 'kicked') && (oldStatus === 'member' || oldStatus === 'administrator' || oldStatus === 'creator')) {
        await notifyAdmins(chat.id, `
🚪 <b>User Left</b>

👤 <b>User:</b> ${user.first_name || ''} ${user.last_name || ''}
🔗 <b>Username:</b> @${user.username || 'N/A'}
🆔 <b>User ID:</b> <code>${user.id}</code>

📢 <b>Group:</b> ${chat.title}
🆔 <b>Chat ID:</b> <code>${chat.id}</code>
📚 <b>Type:</b> ${chat.type}
👥 <b>Total Members:</b> ${memberCount}
        `.trim())
      }
    }
  }

  res.send('ok')
})

app.listen(3000)
