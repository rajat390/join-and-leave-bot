import express from 'express'
import fetch from 'node-fetch'

const app = express()
app.use(express.json())

const TOKEN = '7514098747:AAG7S1YO2g4HDnsHDz3vCzxCrOtEmvwsIZg'
const API_URL = `https://api.telegram.org/bot${TOKEN}`

const notifyJoin = true
const notifyLeave = true

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

app.post('/', async (req, res) => {
  const body = req.body

  if (body.message) {
    const msg = body.message
    const chat_id = msg.chat.id
    const text = msg.text
    const message_id = msg.message_id

    if (text === '/start') {
      await sendMessage(chat_id, `👋 <b>Welcome to the bot!</b>`, message_id, {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: `https://t.me/${(await (await fetch(`${API_URL}/getMe`)).json()).result.username}?startgroup=true` }],
          [{ text: '📢 Join Channel', url: 'https://t.me/YOUR_CHANNEL_USERNAME' }]
        ]
      })
    }
  }

  if (body.my_chat_member || body.chat_member) {
    const data = body.my_chat_member || body.chat_member
    const chat = data.chat
    const user = data.new_chat_member.user
    const status = data.new_chat_member.status
    const isJoin = status === 'member'
    const isLeave = status === 'left' || status === 'kicked'

    const memberCount = await getMemberCount(chat.id)
    const admins = await getAdmins(chat.id)

    for (const admin of admins) {
      const id = admin.user.id

      if (isJoin && notifyJoin) {
        await sendMessage(id, `
✅ <b>New Member Joined</b>

👤 <b>User:</b> ${user.first_name || ''} ${user.last_name || ''} 
🔗 <b>Username:</b> @${user.username || 'N/A'}
🆔 <b>User ID:</b> <code>${user.id}</code>

📢 <b>Group:</b> ${chat.title}
🆔 <b>Chat ID:</b> <code>${chat.id}</code>
📚 <b>Type:</b> ${chat.type}
👥 <b>Total Members:</b> ${memberCount}
        `.trim())
      }

      if (isLeave && notifyLeave) {
        await sendMessage(id, `
🚪 <b>Member Left or Removed</b>

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
