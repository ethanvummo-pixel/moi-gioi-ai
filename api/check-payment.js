// api/check-payment.js
// Web hỏi SePay: "đơn này (theo nội dung CK) đã có tiền vào chưa?"
// Dùng cho auto-xác nhận thanh toán trên trang.
//
// Biến môi trường cần set trong Vercel:
//   SEPAY_API_TOKEN : API Token lấy từ my.sepay.vn (Cấu hình → API Token) của TÀI KHOẢN NHẬN TIỀN
//   SEPAY_ACCOUNT   : (tùy chọn) số tài khoản nhận tiền (mặc định 103878529931)

module.exports = async (req, res) => {
  const token   = process.env.SEPAY_API_TOKEN;
  const account = process.env.SEPAY_ACCOUNT || '103878529931';
  const code    = String(req.query.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const amount  = Number(req.query.amount || 0);

  if (!code)  return res.status(400).json({ paid: false, error: 'missing_code' });
  if (!token) return res.status(200).json({ paid: false, error: 'no_token' }); // chưa cấu hình token

  try {
    const url = 'https://my.sepay.vn/userapi/transactions/list'
              + '?account_number=' + encodeURIComponent(account)
              + '&limit=30';
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const data = await r.json();
    const txs = (data && data.transactions) || [];

    // Tìm giao dịch tiền vào có nội dung chứa mã đơn (mã đơn đã duy nhất theo từng khách)
    const hit = txs.find(t => {
      const c = String(t.transaction_content || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const inAmt = Number(t.amount_in || 0);
      return c.includes(code) && inAmt > 0;
    });

    if (hit) {
      return res.status(200).json({ paid: true, amount: Number(hit.amount_in), date: hit.transaction_date });
    }
    return res.status(200).json({ paid: false });
  } catch (e) {
    return res.status(200).json({ paid: false, error: String(e) });
  }
};
