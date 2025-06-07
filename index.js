import express from 'express'
import fetch from 'node-fetch'

const app = express()
app.use(express.json())

const TOKEN = '7514098747:AAG7S1YO2g4HDnsHDz3vCzxCrOtEmvwsIZg'
const API_URL = `https://api.telegram.org/bot${TOKEN}`

async function sendMessage(chat_id, text, reply_to_message_id = null, reply_markup = null) {
  const payload = { chat_id, text, parse_mode: 'Markdown' }
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

app.post('/', async (req, res) => {
  const body = req.body

  if (body.message) {
    const msg = body.message
    const chat_id = msg.chat.id
    const text = msg.text
    const message_id = msg.message_id

    if (text === '/start') {
      await sendMessage(chat_id, `👋 Welcome to the bot!`, message_id, {
        inline_keyboard: [
          [{ text: '➕ Add to Group', url: `https://t.me/${(await (await fetch(`${API_URL}/getMe`)).json()).result.username}?startgroup=true` }],
          [{ text: '📢 Join Channel', url: 'https://t.me/YOUR_CHANNEL_USERNAME' }]
        ]
      })
    }
  }

  if (body.my_chat_member || body.chat_member) {
    const data = body.my_chat_member || body.chat_member
    const chat_id = data.chat.id
    const user = data.new_chat_member.user
    const status = data.new_chat_member.status
    const action = status === 'left' || status === 'kicked' ? '🚪 Left or Removed' : '✅ Joined'
    const admins = await getAdmins(chat_id)

    for (const admin of admins) {
      const id = admin.user.id
      await sendMessage(id, `👤 ${user.first_name} (${user.id}) ${action} from ${data.chat.title}`)
    }
  }

  res.send('ok')
})

app.listen(3000)
