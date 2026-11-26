/** Keep each clock value and its Spanish day period on the same line. */
export function wholeSpanishTimes(text: string) {
  return text.replace(/(\d)[\u0020\u00a0\u202f]*([ap])\.?[\u0020\u00a0\u202f]*m\.?\b\.?/gi,
    (_, digit: string, half: string) => `${digit}\u00a0${half.toLowerCase()}.\u00a0m.`);
}
