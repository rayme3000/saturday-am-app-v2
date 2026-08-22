// A comprehensive, browser-safe dictionary of profanity, slurs, and leetspeak variations.
const BAD_WORDS = [
  'fuck', 'fuk', 'fck', 'f_ck', 'f*ck', 'fucka', 'motherfucker',
  'shit', 'sh1t', 'sh*t', 'bullshit',
  'bitch', 'b1tch', 'b*tch',
  'asshole', 'a-hole', 'a$$hole',
  'cunt', 'c*nt',
  'faggot', 'fag',
  'nigger', 'nigga', 'n1gga', 'n*gga', 'n!gga', 'ni99a',
  'spic',
  'slut', 'sl*t',
  'whore', 'wh0re',
  'retard',
  'kike', 'chink', 'gook', 'twat', 'pussy', 'dick', 'cock', 'bastard'
];

/**
 * Replaces profanity with asterisks (e.g., "badword" becomes "***")
 */
export const cleanText = (text: string): string => {
  if (!text) return text;
  let cleaned = text;

  BAD_WORDS.forEach((word) => {
    // Safely escape special characters like *, $, or ! for the regex
    const escapedWord = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    
    // Check if the word is pure letters/numbers, or if it has special characters (like f*ck)
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(word);
    
    if (isAlphanumeric) {
        // Safe standard word boundary PLUS any trailing letters (catches -ing, -er, -s automatically)
        const regex = new RegExp(`\\b${escapedWord}[a-zA-Z]*\\b`, 'gi');
        cleaned = cleaned.replace(regex, '***');
    } else {
        // Universally safe boundary for special characters PLUS trailing letters
        const regex = new RegExp(`(^|\\s)${escapedWord}[a-zA-Z]*(?=\\s|$)`, 'gi');
        cleaned = cleaned.replace(regex, '$1***');
    }
  });

  return cleaned;
};

/**
 * Returns true if the text contains any profanity or slurs.
 * Used to block toxic usernames during account creation.
 */
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  
  return BAD_WORDS.some((word) => {
    const escapedWord = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(word);
    
    if (isAlphanumeric) {
        return new RegExp(`\\b${escapedWord}[a-zA-Z]*\\b`, 'gi').test(text);
    } else {
        return new RegExp(`(^|\\s)${escapedWord}[a-zA-Z]*(?=\\s|$)`, 'gi').test(text);
    }
  });
};