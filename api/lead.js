// api/lead.js
// Lead magnet → Telegram: báo có người đăng ký nhận quà miễn phí.
// Dùng chung biến môi trường với webhook:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, note: 'lead endpoint Môi Giới AI' });
  }
  try {
    const d = req.body || {};
    const name   = String(d.name || '').slice(0, 80);
    const phone  = String(d.phone || '').slice(0, 30);
    const source = String(d.source || '').slice(0, 60);

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const msg =
      '🧲 *LEAD MỚI — Lead Magnet*\n\n' +
      '👤 Tên: *' + name + '*\n' +
      '📞 SĐT/Zalo: `' + phone + '`\n' +
      '🎯 Nguồn: ' + source + '\n' +
      '⏰ ' + new Date().toLocaleString('vi-VN');

    if (token && chatId) {
      await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true })
      });
    } else {
      console.warn('Thiếu TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — chưa gửi được Telegram');
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead error:', err);
    return res.status(200).json({ ok: false, error: String(err) });
  }
};
