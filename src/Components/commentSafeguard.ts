export interface SafeguardMatch {
  phrase: string;
  index: number;
  length: number;
  category: 'slur_harassment' | 'creator_hostility' | 'profanity_insult' | 'spam_link' | 'shouting';
  severity: 'block' | 'hold';
  reason: string;
}

export interface SafeguardAnalysis {
  isClean: boolean;
  isBlocked: boolean; // True = hard-disable "Post Comment" (severe slurs/threats)
  shouldHoldForReview: boolean; // True = highlight inline + shadowban to 'pending_review'
  matches: SafeguardMatch[];
  flaggedReasons: string[];
}

interface RuleDefinition {
  pattern: RegExp;
  category: SafeguardMatch['category'];
  severity: 'block' | 'hold';
  reason: string;
}

const SAFEGUARD_RULES: RuleDefinition[] = [
  // 1. SEVERE SLURS, THREATS & SELF-HARM (HARD BLOCK — Cannot be submitted at all)
  {
    pattern: /\b(kys|kill yourself|go die|neck yourself|hope you die|retard|retarded|faggot|fag|tranny|nigger|nigga|chink|spic|wetback|kike|whore|slut|cunt|rape)\b/gi,
    category: 'slur_harassment',
    severity: 'block',
    reason: 'Severe slurs, threats, and hate speech are strictly blocked. Remove highlighted words to post.'
  },

  // 2. DIRECT CREATOR ATTACKS & HARASSMENT (SHADOWBAN HOLD — Highlights inline & routes to 'pending_review')
  {
    pattern: /\b(i hate you|hate you|you suck|this sucks|sucks ass|sucks so bad|fire the artist|worst artist|lazy artist|quit drawing|stop drawing|creator is lazy|horrible art|ugly art|waste of ink|worst manga|garbage series|trash series)\b/gi,
    category: 'creator_hostility',
    severity: 'hold',
    reason: 'Hostile phrasing toward creators or series detected. Posting as-is will hold this comment for moderator review.'
  },

  // 3. GENERAL PROFANITY, INSULTS & NAME-CALLING (SHADOWBAN HOLD — Highlights inline & routes to 'pending_review')
  {
    pattern: /\b(stupid|stupid ass|dumbass|dumb|idiot|moron|loser|pathetic|worthless|useless|trash|garbage|rubbish|dogshit|horseshit|bullshit|shit|shitty|fuck|fucking|fucked|fucker|motherfucker|bitch|ass|asshole|dick|dickhead|piss off|stfu|wtf|crap|crappy|hella mid|mid af|boring af|unreadable|fell off|rip off|ripoff)\b/gi,
    category: 'profanity_insult',
    severity: 'hold',
    reason: 'Profanity or insulting language detected. Rephrase constructively, or your comment will be held for moderator review.'
  },

  // 4. EXTERNAL LINKS & SPAM (SHADOWBAN HOLD)
  {
    pattern: /(https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+|t\.me\/[^\s]+)/gi,
    category: 'spam_link',
    severity: 'hold',
    reason: 'External links require moderator approval before appearing publicly.'
  }
];

export function analyzeCommentText(text: string): SafeguardAnalysis {
  const raw = String(text || '');
  if (!raw.trim()) {
    return {
      isClean: true,
      isBlocked: false,
      shouldHoldForReview: false,
      matches: [],
      flaggedReasons: []
    };
  }

  const rawMatches: SafeguardMatch[] = [];

  for (const rule of SAFEGUARD_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      rawMatches.push({
        phrase: match[0],
        index: match.index,
        length: match[0].length,
        category: rule.category,
        severity: rule.severity,
        reason: rule.reason
      });
    }
  }

  // Sort by start index, then prefer longer matches if two rules start at the same index
  rawMatches.sort((a, b) => a.index - b.index || b.length - a.length);

  // Deduplicate overlapping matches
  const matches: SafeguardMatch[] = [];
  let lastEnd = -1;
  for (const m of rawMatches) {
    if (m.index >= lastEnd) {
      matches.push(m);
      lastEnd = m.index + m.length;
    } else if (m.severity === 'block' && matches.length > 0 && matches[matches.length - 1].severity !== 'block') {
      matches[matches.length - 1] = m;
      lastEnd = m.index + m.length;
    }
  }

  // Check for excessive ALL-CAPS shouting (> 25 letters and > 70% uppercase)
  const lettersOnly = raw.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 25) {
    const upperCount = raw.replace(/[^A-Z]/g, '').length;
    if (upperCount / lettersOnly.length > 0.7) {
      matches.push({
        phrase: 'ALL-CAPS SHOUTING',
        index: 0,
        length: raw.length,
        category: 'shouting',
        severity: 'hold',
        reason: 'Excessive ALL-CAPS shouting detected.'
      });
    }
  }

  const isBlocked = matches.some(m => m.severity === 'block');
  const shouldHoldForReview = !isBlocked && matches.some(m => m.severity === 'hold');
  const flaggedReasons = Array.from(
    new Set(matches.map(m => `${m.category.toUpperCase()}: "${m.phrase}"`))
  );

  return {
    isClean: matches.length === 0,
    isBlocked,
    shouldHoldForReview,
    matches,
    flaggedReasons
  };
}

export function buildHighlightedSegments(
  text: string,
  matches: SafeguardMatch[]
): Array<{ text: string; match?: SafeguardMatch }> {
  const inlineMatches = matches.filter(m => m.length > 0 && m.phrase !== 'ALL-CAPS SHOUTING');
  if (inlineMatches.length === 0) {
    return [{ text }];
  }

  const segments: Array<{ text: string; match?: SafeguardMatch }> = [];
  let cursor = 0;

  for (const m of inlineMatches) {
    if (m.index < cursor) continue;
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index) });
    }
    segments.push({
      text: text.slice(m.index, m.index + m.length),
      match: m
    });
    cursor = m.index + m.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}