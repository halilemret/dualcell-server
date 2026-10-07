// 1) "kod: 123456" biçimi  2) "123456 nolu şifreniz" biçimi
const OTP_PATTERNS = [
  /(?:kod(?:unuz)?|şifre(?:niz)?|code|otp|doğrulama|onay|password|pin)[\s:]*([0-9]{4,8})\b/i,
  /\b([0-9]{4,8})\b[^\n]{0,30}?(?:şifre|kod|code|otp|pin)/i,
];

export function extractOtp(text = '') {
  for (const re of OTP_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[1];
  }
  return null;
}
