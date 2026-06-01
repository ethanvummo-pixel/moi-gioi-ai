// api/sepay-webhook.js
// SePay → Telegram: báo đơn tự động cho MÔI GIỚI AI
// Vercel Serverless Function (Node.js) — KHÔNG cần thư viện ngoài.
//
// Biến môi trường cần set trong Vercel (Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN  : token bot lấy từ @BotFather
//   TELEGRAM_CHAT_ID    : chat id của anh (hoặc group) để nhận thông báo
//   SEPAY_API_KEY       : (tùy chọn) API key trùng với cấu hình webhook trên SePay để xác thực

const PLAN_NAMES  = { MGAIBASIC: 'CƠ BẢN', MGAIFULL: 'ĐẦY ĐỦ', MGAIVIP: 'VIP' };
const PLAN_PRICES = { MGAIBASIC: 297000, MGAIFULL: 497000, MGAIVIP: 1997000 };

module.exports = async (req, res) => {
  // GET: dùng để kiểm tra endpoint còn sống
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', note: 'SePay webhook endpoint MÔI GIỚI AI' });
  }

  // Xác thực bằng API Key (nếu đã cấu hình) — chống webhook giả
  const apiKey = process.env.SEPAY_API_KEY;
  if (apiKey) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Apikey ${apiKey}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const data = req.body || {};

    // Chỉ xử lý giao dịch TIỀN VÀO
    if (data.transferType && data.transferType !== 'in') {
      return res.status(200).json({ status: 'ignored' });
    }

    const amount  = Number(data.transferAmount || 0);
    const content = String(data.content || data.description || '');
    const ref     = data.referenceCode || data.id || '';
    const bank    = data.bankBrandName || data.gateway || '';
    const when    = data.transactionDate || new Date().toLocaleString('vi-VN');

    // Tách gói + 4 số cuối SĐT từ nội dung CK (vd: MGAIFULL9719)
    const m = content.toUpperCase().match(/MGAI(BASIC|FULL|VIP)(\d{4})?/);
    const planKey   = m ? 'MGAI' + m[1] : null;
    const planName  = planKey ? PLAN_NAMES[planKey] : '(không rõ gói)';
    const phoneTail = (m && m[2]) ? m[2] : '----';
    const expected  = planKey ? PLAN_PRICES[planKey] : null;

    // So số tiền nhận với giá đúng của gói → cảnh báo lệch tiền
    let status;
    if (expected == null)         status = 'ℹ️ Không rõ gói — kiểm tra nội dung CK trước khi giao.';
    else if (amount === expected) status = '✅ *Số tiền KHỚP gói — có thể giao ngay!*';
    else if (amount < expected)   status = '⚠️ *THIẾU ' + (expected - amount).toLocaleString('vi-VN') + 'đ* (cần ' + expected.toLocaleString('vi-VN') + 'đ) — kiểm tra trước khi giao!';
    else                          status = '⚠️ *DƯ ' + (amount - expected).toLocaleString('vi-VN') + 'đ* (gói cần ' + expected.toLocaleString('vi-VN') + 'đ).';

    const msg =
      '🛒 *ĐƠN HÀNG MỚI — MÔI GIỚI AI*\n\n' +
      '📦 Gói: *' + planName + '*' + (expected ? ' (cần ' + expected.toLocaleString('vi-VN') + 'đ)' : '') + '\n' +
      '💰 Số tiền: `' + amount.toLocaleString('vi-VN') + ' đ`\n' +
      '🔖 Nội dung CK: `' + content + '`\n' +
      '📞 SĐT (4 số cuối): ' + phoneTail + '\n' +
      '🏦 Ngân hàng: ' + bank + '\n' +
      '🧾 Mã GD: `' + ref + '`\n' +
      '⏰ ' + when + '\n\n' +
      status;

    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true })
      });
    } else {
      console.warn('Thiếu TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — chưa gửi được Telegram');
    }

    // Trả 200 để SePay coi là đã nhận
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Vẫn trả 200 để SePay không retry dồn dập; lỗi đã ghi log
    return res.status(200).json({ success: false, error: String(err) });
  }
};
