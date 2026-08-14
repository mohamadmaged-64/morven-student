const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','am','are','was',
  'were','be','been','being','have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','dare','ought','used','this','that','these','those','i','me','my','mine',
  'myself','you','your','yours','yourself','he','him','his','himself','she','her','hers','herself','it',
  'its','itself','we','us','our','ours','ourselves','they','them','their','theirs','themselves','what',
  'which','who','whom','when','where','why','how','all','each','every','both','few','more','most','other',
  'some','such','no','nor','not','only','own','same','so','than','too','very','just','about','above',
  'after','again','also','am','as','before','between','during','into','over','under','then','once','here',
  'there','if','because','until','while','through','down','out','off','up','further','once','get','got',
  'get','gets','getting','let','say','said','go','going','went','come','came','take','took','make','made',
  'know','knew','think','thought','see','saw','want','give','gave','use','used','find','found','tell',
  'told','ask','asked','work','seem','feel','felt','try','tried','leave','called','call','like','look',
  'looked','right','well','also','way','even','new','want','because','any','time','much','good','much',
  'first','last','long','great','little','own','old','big','high','different','small','large','next',
  'early','young','important','public','bad','same','able','thing','things','many','much','lot','still',
]);

const ARABIC_STOP_WORDS = new Set([
  'في','من','إلى','على','عن','مع','هذا','هذه','ذلك','تلك','التي','الذي','الذين','اللذين','اللتين',
  'هو','هي','هم','هن','أنا','نحن','أنت','أنتِ','أنتما','أنتم','أنتن','هم','هن','كان','يكون',
  'ليس','ليست','لا','ما','قد','بل','حتى','إذا','إن','أن','لا','ثم','أو','بين','عند','بعد',
  'قبل','دون','خلال','بسبب','مثل','أكثر','أقل','بعض','كل','وقد','وليس','ولا','أما','إلا',
  'كانوا','كانت','لكن','أما','حيث','كيف','لماذا','متى','أين','ما','هناك','هنا','ذلك',
]);

const PHRASE_DICT: Record<string, Record<string, string>> = {
  'en-ar': {
    'hello': 'مرحبا',
    'goodbye': 'وداعا',
    'thank you': 'شكرا',
    'please': 'من فضلك',
    'yes': 'نعم',
    'no': 'لا',
    'good morning': 'صباح الخير',
    'good evening': 'مساء الخير',
    'how are you': 'كيف حالك',
    'i am fine': 'أنا بخير',
    'welcome': 'أهلا وسهلا',
    'sorry': 'آسف',
    'excuse me': 'عذرا',
    'help': 'مساعدة',
    'water': 'ماء',
    'food': 'طعام',
    'house': 'منزل',
    'school': 'مدرسة',
    'student': 'طالب',
    'teacher': 'معلم',
    'book': 'كتاب',
    'pen': 'قلم',
    'paper': 'ورقة',
    'computer': 'حاسوب',
    'internet': 'إنترنت',
    'phone': 'هاتف',
    'friend': 'صديق',
    'family': 'عائلة',
    'mother': 'أم',
    'father': 'أب',
    'brother': 'أخ',
    'sister': 'أخت',
    'city': 'مدينة',
    'country': 'بلد',
    'world': 'عالم',
    'time': 'وقت',
    'day': 'يوم',
    'night': 'ليل',
    'today': 'اليوم',
    'tomorrow': 'غدا',
    'yesterday': 'أمس',
    'week': 'أسبوع',
    'month': 'شهر',
    'year': 'سنة',
    'love': 'حب',
    'happy': 'سعيد',
    'sad': 'حزين',
    'big': 'كبير',
    'small': 'صغير',
    'new': 'جديد',
    'old': 'قديم',
    'important': 'مهم',
    'beautiful': 'جميل',
    'study': 'دراسة',
    'learn': 'تعلم',
    'teach': 'يعلم',
    'read': 'يقرأ',
    'write': 'يكتب',
    'think': 'يفكر',
    'understand': 'يفهم',
    'knowledge': 'معرفة',
    'science': 'علم',
    'history': 'تاريخ',
    'math': 'رياضيات',
    'english': 'إنجليزي',
    'arabic': 'عربي',
    'theology': 'علم الكلام',
    'islamic studies': 'الدراسات الإسلامية',
    'philosophy': 'فلسفة',
    'literature': 'أدب',
    'medicine': 'طب',
    'engineering': 'هندسة',
    'law': 'قانون',
    'economy': 'اقتصاد',
    'psychology': 'علم النفس',
    'sociology': 'علم الاجتماع',
    'biology': 'أحياء',
    'chemistry': 'كيمياء',
    'physics': 'فيزياء',
    'the introduction discusses': 'يتحدث المقدمة عن',
    'this paper examines': 'يختبر هذا البحث',
    'the results show': 'تظهر النتائج',
    'in conclusion': 'في الختام',
    'further research': 'مزيد من البحث',
  },
  'ar-en': {
    'مرحبا': 'hello',
    'وداعا': 'goodbye',
    'شكرا': 'thank you',
    'من فضلك': 'please',
    'نعم': 'yes',
    'لا': 'no',
    'صباح الخير': 'good morning',
    'مساء الخير': 'good evening',
    'كيف حالك': 'how are you',
    'أنا بخير': 'i am fine',
    'أهلا وسهلا': 'welcome',
    'آسف': 'sorry',
    'عذرا': 'excuse me',
    'مساعدة': 'help',
    'ماء': 'water',
    'طعام': 'food',
    'منزل': 'house',
    'مدرسة': 'school',
    'طالب': 'student',
    'معلم': 'teacher',
    'كتاب': 'book',
    'قلم': 'pen',
    'ورقة': 'paper',
    'حاسوب': 'computer',
    'إنترنت': 'internet',
    'هاتف': 'phone',
    'صديق': 'friend',
    'عائلة': 'family',
    'أم': 'mother',
    'أب': 'father',
    'أخ': 'brother',
    'أخت': 'sister',
    'مدينة': 'city',
    'بلد': 'country',
    'عالم': 'world',
    'وقت': 'time',
    'يوم': 'day',
    'ليل': 'night',
    'اليوم': 'today',
    'غدا': 'tomorrow',
    'أمس': 'yesterday',
    'أسبوع': 'week',
    'شهر': 'month',
    'سنة': 'year',
    'حب': 'love',
    'سعيد': 'happy',
    'حزين': 'sad',
    'كبير': 'big',
    'صغير': 'small',
    'جديد': 'new',
    'قديم': 'old',
    'مهم': 'important',
    'جميل': 'beautiful',
    'دراسة': 'study',
    'تعلم': 'learn',
    'يعلم': 'teach',
    'يقرأ': 'read',
    'يكتب': 'write',
    'يفكر': 'think',
    'يفهم': 'understand',
    'معرفة': 'knowledge',
    'علم': 'science',
    'تاريخ': 'history',
    'رياضيات': 'math',
    'إنجليزي': 'english',
    'عربي': 'arabic',
    'فلسفة': 'philosophy',
    'أدب': 'literature',
    'طب': 'medicine',
    'هندسة': 'engineering',
    'قانون': 'law',
    'اقتصاد': 'economy',
    'في الختام': 'in conclusion',
  },
};

interface MCQ {
  question: string;
  options: string[];
  correct: number;
}

interface TrueFalse {
  statement: string;
  answer: boolean;
}

interface StudyPlanDay {
  day: number;
  topics: string[];
  duration: number;
}

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const raw = cleaned.split(/(?<=[.!?])\s+(?=[A-Z\u0600-\u06FF\u0621-\u064A])/);
  return raw.filter(s => s.trim().length > 10);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z\u0600-\u06FF\u0621-\u064A\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function tokenizeArabic(text: string): string[] {
  return text
    .replace(/[^\u0600-\u06FF\u0621-\u064A\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function wordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

function sentenceScore(sentence: string, freq: Map<string, number>): number {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;
  let score = 0;
  for (const w of words) {
    score += freq.get(w) || 0;
  }
  return score / words.length;
}

function getTopWords(freq: Map<string, number>, count: number): string[] {
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(e => e[0]);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanSentence(s: string): string {
  return s.replace(/^\s*[-•*]\s*/, '').replace(/\s+/g, ' ').trim();
}

export function summarizeText(text: string, maxLength = 3): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) return trimmed;
  if (sentences.length <= maxLength) return trimmed;

  const freq = wordFrequency(tokenize(trimmed));
  const scored = sentences.map((s, i) => ({ sentence: s, score: sentenceScore(s, freq), index: i }));
  const top = scored.sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxLength)
    .sort((a, b) => a.index - b.index);

  return top.map(t => capitalize(cleanSentence(t.sentence))).join(' ');
}

export function extractKeyIdeas(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) return [trimmed];

  const freq = wordFrequency(tokenize(trimmed));
  const scored = sentences.map(s => ({ sentence: s, score: sentenceScore(s, freq) }));
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const count = Math.min(Math.max(3, Math.ceil(sentences.length * 0.3)), 10);
  return sorted.slice(0, count).map(s => capitalize(cleanSentence(s.sentence)));
}

export function paragraphToBullets(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) {
    return trimmed.split(/\n/).filter(l => l.trim()).map(l => cleanSentence(l));
  }
  return sentences.map(s => cleanSentence(s)).filter(s => s.length > 0);
}

export function bulletsToArticle(bullets: string[]): string {
  if (bullets.length === 0) return '';
  const lines = bullets.map(b => cleanSentence(b.replace(/^[-•*]\s*/, '')));

  if (lines.length === 1) return lines[0];

  const first = capitalize(lines[0]);
  const middle = lines.slice(1, -1).map(l => {
    if (l.endsWith('.') || l.endsWith('!') || l.endsWith('?')) return capitalize(l);
    return capitalize(l) + '.';
  }).join(' ');

  const last = lines[lines.length - 1];
  const lastSentence = last.endsWith('.') || last.endsWith('!') || last.endsWith('?')
    ? capitalize(last) : capitalize(last) + '.';

  if (lines.length === 2) return `${first} ${lastSentence}`;
  return `${first} ${middle} ${lastSentence}`;
}

export function explainSimply(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const complexWords: Record<string, string> = {
    'utilize': 'use', 'utilization': 'use', 'subsequently': 'then', 'furthermore': 'also',
    'consequently': 'so', 'approximately': 'about', 'demonstrate': 'show', 'demonstrates': 'shows',
    'facilitate': 'help', 'implement': 'do', 'implementation': 'doing', 'methodology': 'method',
    'comprehensive': 'complete', 'significant': 'big', 'necessitate': 'need', 'terminate': 'end',
    'ameliorate': 'improve', 'commence': 'start', 'endeavor': 'try', 'ascertain': 'find out',
    'enumerate': 'list', 'expedite': 'speed up', 'disseminate': 'share', 'proliferate': 'spread',
    'exacerbate': 'make worse', 'conundrum': 'problem', 'paradigm': 'model', 'aforementioned': 'this',
    'notwithstanding': 'despite', 'insofar': 'as far as', 'heretofore': 'until now',
    'therein': 'in that', 'hereafter': 'after this', 'wherein': 'in which',
    'phenomenon': 'event', 'predominantly': 'mostly', 'substantiate': 'prove',
    'hypothesis': 'guess', 'elaborate': 'detailed', 'implications': 'effects',
    'contemporary': 'modern', 'cognitive': 'thinking', 'metropolitan': 'big city',
    'anthropomorphize': 'compare to humans', 'juxtapose': 'compare', 'mitigate': 'reduce',
    'synthesis': 'combination', 'autonomous': 'independent', 'ubiquitous': 'everywhere',
    'paradigmatic': 'typical', 'articulate': 'express', 'sophisticated': 'complex',
    'unprecedented': 'new', 'empirical': 'based on facts', 'heuristic': 'trial and error',
    'prerequisite': 'requirement', 'subsequent': 'next', 'preceding': 'before',
    'concurrent': 'at the same time', 'interpolate': 'estimate', 'extrapolate': 'predict',
  };

  let simplified = trimmed;
  for (const [complex, simple] of Object.entries(complexWords)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  }

  const sentences = splitSentences(simplified);
  if (sentences.length <= 1) {
    const words = simplified.split(/\s+/);
    if (words.length > 30) {
      const mid = Math.floor(words.length / 2);
      const breakPoint = words.indexOf('.', mid) + 1 || mid;
      const firstHalf = words.slice(0, breakPoint).join(' ');
      const secondHalf = words.slice(breakPoint).join(' ');
      return `In simple terms: ${firstHalf}\n\n${secondHalf}`;
    }
    return `In simple terms: ${simplified}`;
  }

  const short = sentences.map(s => {
    const words = s.split(/\s+/);
    if (words.length > 20) {
      const quarter = Math.floor(words.length / 3);
      const breakPoint1 = words.indexOf('.', quarter) + 1 || quarter;
      const breakPoint2 = words.indexOf('.', quarter * 2) + 1 || quarter * 2;
      const p1 = words.slice(0, breakPoint1).join(' ');
      const p2 = words.slice(breakPoint1, breakPoint2).join(' ');
      const p3 = words.slice(breakPoint2).join(' ');
      return [p1, p2, p3].filter(p => p.trim()).join('\n');
    }
    return s;
  });

  return `In simple terms:\n\n${short.join('\n\n')}`;
}

export function rewriteText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const swapPairs: [RegExp, string | ((m: string) => string)][] = [
    [/\b(is|are|was|were)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'is': 'remains', 'are': 'remain', 'was': 'was', 'were': 'were' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(very|really|extremely)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'very': 'quite', 'really': 'truly', 'extremely': 'highly' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(good|bad|big|small)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'good': 'excellent', 'bad': 'poor', 'big': 'large', 'small': 'modest' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(think|believe|feel)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'think': 'consider', 'believe': 'maintain', 'feel': 'sense' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(important|significant|essential)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'important': 'crucial', 'significant': 'vital', 'essential': 'indispensable' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(shows?|demonstrates?)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'show': 'illustrate', 'shows': 'illustrates', 'demonstrate': 'reveal', 'demonstrates': 'reveals' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(because|since|as)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'because': 'as', 'since': 'given that', 'as': 'inasmuch as' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(many|much|a lot of)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'many': 'numerous', 'much': 'considerable', 'a lot of': 'a substantial number of' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(uses?|used)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'use': 'employ', 'uses': 'employs', 'used': 'employed' };
      return map[m.toLowerCase()] || m;
    }],
    [/\b(additionally|also|moreover)\b/gi, (m: string) => {
      const map: Record<string, string> = { 'additionally': 'furthermore', 'also': 'likewise', 'moreover': 'in addition' };
      return map[m.toLowerCase()] || m;
    }],
  ];

  let result = trimmed;
  for (const [pattern, replacement] of swapPairs) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement);
    }
  }

  const sentences = splitSentences(result);
  if (sentences.length <= 1) return result;

  const rewritten = sentences.map((s, i) => {
    let sent = s;
    if (i === 0) {
      sent = capitalize(sent);
    }
    if (i > 0 && i % 3 === 0 && sent.length > 20) {
      const words = sent.split(/\s+/);
      if (words.length > 5) {
        const mid = Math.floor(words.length / 2);
        sent = words.slice(0, mid).join(' ') + ' — ' + words.slice(mid).join(' ');
      }
    }
    return sent;
  });

  return rewritten.join(' ');
}

export function grammarCheck(text: string): { corrected: string; issues: string[] } {
  const issues: string[] = [];
  let corrected = text;

  const doubleSpace = /\s{2,}/g;
  if (doubleSpace.test(corrected)) {
    corrected = corrected.replace(doubleSpace, ' ');
    issues.push('Removed extra whitespace');
  }

  const patterns: [RegExp, string | ((m: string) => string), string][] = [
    [/\bi\b/g, 'I', 'Capitalized "i" to "I"'],
    [/\bi('m|'ve|'ll|'d|'re|'s)\b/g, (m: string) => 'I' + m.slice(1), 'Fixed capitalization of "I"'],
    [/\bteh\b/gi, 'the', 'Fixed typo: "teh" → "the"'],
    [/\brecieve\b/gi, 'receive', 'Fixed spelling: "recieve" → "receive"'],
    [/\boccured\b/gi, 'occurred', 'Fixed spelling: "occured" → "occurred"'],
    [/\bseperate\b/gi, 'separate', 'Fixed spelling: "seperate" → "separate"'],
    [/\bdefinately\b/gi, 'definitely', 'Fixed spelling: "definately" → "definitely"'],
    [/\baccomodate\b/gi, 'accommodate', 'Fixed spelling: "accommodate" → "accommodate"'],
    [/\boccurence\b/gi, 'occurrence', 'Fixed spelling: "occurence" → "occurrence"'],
    [/\bneccessary\b/gi, 'necessary', 'Fixed spelling: "neccessary" → "necessary"'],
    [/\buntill\b/gi, 'until', 'Fixed spelling: "untill" → "until"'],
    [/\bwierd\b/gi, 'weird', 'Fixed spelling: "wierd" → "weird"'],
    [/\bthier\b/gi, 'their', 'Fixed spelling: "thier" → "their"'],
    [/\blenght\b/gi, 'length', 'Fixed spelling: "lenght" → "length"'],
    [/\bwidht\b/gi, 'width', 'Fixed spelling: "widht" → "width"'],
    [/\bheigth\b/gi, 'height', 'Fixed spelling: "heigth" → "height"'],
    [/\bwich\b/gi, 'which', 'Fixed spelling: "wich" → "which"'],
    [/\bwich\b/gi, 'which', 'Fixed spelling: "wich" → "which"'],
    [/\bthats\b/gi, "that's", 'Added apostrophe: "thats" → "that\'s"'],
    [/\bits a\b/gi, "it's a", 'Added apostrophe: "its a" → "it\'s a"'],
    [/\bcant\b/gi, "can't", 'Added apostrophe: "cant" → "can\'t"'],
    [/\bwont\b/gi, "won't", 'Added apostrophe: "wont" → "won\'t"'],
    [/\bdont\b/gi, "don't", 'Added apostrophe: "dont" → "don\'t"'],
    [/\bdoesnt\b/gi, "doesn't", 'Added apostrophe: "doesnt" → "doesn\'t"'],
    [/\bshouldnt\b/gi, "shouldn't", 'Added apostrophe: "shouldnt" → "shouldn\'t"'],
    [/\bwouldnt\b/gi, "wouldn't", 'Added apostrophe: "wouldnt" → "wouldn\'t"'],
    [/\bcouldnt\b/gi, "couldn't", 'Added apostrophe: "couldnt" → "couldn\'t"'],
    [/\btheyre\b/gi, "they're", 'Added apostrophe: "theyre" → "they\'re"'],
    [/\byoure\b/gi, "you're", 'Added apostrophe: "youre" → "you\'re"'],
    [/\bweve\b/gi, "we've", 'Added apostrophe: "weve" → "we\'ve"'],
    [/\bive\b/gi, "I've", 'Fixed capitalization and apostrophe: "ive" → "I\'ve"'],
    [/\b(a) (aeiou)/gi, '$1n $2', 'Fixed article: "a" → "an" before vowel'],
    [/\ban ([^aeiou])/gi, 'a $1', 'Fixed article: "an" → "a" before consonant'],
    [/\b(more|less) better\b/gi, '$1 good', 'Fixed comparative: "$1 better" → "$1 good"'],
    [/\b(more|less) worse\b/gi, '$1 bad', 'Fixed comparative: "$1 worse" → "$1 bad"'],
    [/\bvery unique\b/gi, 'unique', 'Removed redundant modifier: "very unique"'],
    [/\bmost unique\b/gi, 'unique', 'Removed redundant modifier: "most unique"'],
    [/\bimpactful\b/gi, 'impactful', 'Consider replacing "impactful" with "significant"'],
  ];

  for (const [pattern, replacement, issueText] of patterns) {
    if (pattern.test(corrected)) {
      const prev = corrected;
      if (typeof replacement === 'string') {
        corrected = corrected.replace(pattern, replacement);
      } else {
        corrected = corrected.replace(pattern, replacement);
      }
      if (corrected !== prev && !issues.includes(issueText)) {
        issues.push(issueText);
      }
    }
  }

  if (!text.trim().match(/[.!?]$/)) {
    issues.push('Sentence may be missing ending punctuation');
  }

  const lines = corrected.split('\n');
  const capitalized = lines.map(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return line;
    if (trimmedLine[0] === trimmedLine[0].toUpperCase()) return line;
    return line.replace(trimmedLine, capitalize(trimmedLine));
  });
  const newCorrected = capitalized.join('\n');
  if (newCorrected !== corrected) {
    corrected = newCorrected;
    issues.push('Capitalized sentence beginnings');
  }

  if (issues.length === 0) {
    issues.push('No issues found! The text looks good.');
  }

  return { corrected, issues };
}

export function translateText(text: string, targetLang: 'en' | 'ar'): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const dictKey = targetLang === 'ar' ? 'en-ar' : 'ar-en';
  const dict = PHRASE_DICT[dictKey] || {};

  const lowerText = trimmed.toLowerCase();
  for (const [from, to] of Object.entries(dict)) {
    if (lowerText === from.toLowerCase()) {
      return targetLang === 'ar' ? to : capitalize(to);
    }
  }

  for (const [from, to] of Object.entries(dict)) {
    const regex = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(trimmed)) {
      const result = trimmed.replace(regex, (m) => {
        if (targetLang === 'ar') return to;
        return m[0] === m[0].toUpperCase() ? capitalize(to) : to;
      });
      return result;
    }
  }

  const words = trimmed.split(/\s+/);
  const translated = words.map(w => {
    const lower = w.toLowerCase().replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
    const punct = w.replace(/[a-zA-Z\u0600-\u06FF]/g, '');
    const found = dict[lower];
    if (found) {
      const result = targetLang === 'ar' ? found : found;
      return result + punct;
    }
    return w;
  });

  const result = translated.join(' ');
  if (result === trimmed) {
    return `[${targetLang === 'ar' ? 'Arabic' : 'English'} translation]\n\n${trimmed}\n\nNote: Full translation requires an online translation service. The dictionary contains ${Object.keys(dict).length} common terms. Some words may not have direct translations.`;
  }
  return result;
}

export function extractTerminology(text: string): { term: string; definition: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const terms: { term: string; definition: string }[] = [];
  const sentences = splitSentences(trimmed);

  for (const sentence of sentences) {
    const defMatch = sentence.match(
      /^([A-Z][A-Za-z\s-]+)\s*(?:\(([A-Z][a-z]+(?:\s*[&+]\s*[A-Z][a-z]+)?)\))?\s*(?:is|are|refers?\s+to|means?|defined?\s+as|denotes?)\s+(.+)/i
    );
    if (defMatch) {
      const term = defMatch[1].trim();
      const def = cleanSentence(defMatch[2]);
      if (term.length > 2 && def.length > 5) {
        terms.push({ term, definition: def });
        continue;
      }
    }
  }

  const freq = wordFrequency(tokenize(trimmed));
  const topWords = getTopWords(freq, 15);

  for (const word of topWords) {
    if (terms.some(t => t.term.toLowerCase().includes(word))) continue;
    if (word.length < 4) continue;

    const sentencesWithWord = sentences.filter(s =>
      s.toLowerCase().includes(word.toLowerCase())
    );
    if (sentencesWithWord.length >= 2) {
      const bestSentence = sentencesWithWord.sort((a, b) => {
        const countA = (a.toLowerCase().match(new RegExp(word.toLowerCase(), 'g')) || []).length;
        const countB = (b.toLowerCase().match(new RegExp(word.toLowerCase(), 'g')) || []).length;
        return countB - countA;
      })[0];

      const capitalized = capitalize(word);
      const definition = cleanSentence(bestSentence).replace(
        new RegExp(`\\b${word}\\b`, 'i'),
        `**${capitalized}**`
      );

      if (!terms.some(t => t.term.toLowerCase() === capitalized.toLowerCase())) {
        terms.push({
          term: capitalized,
          definition: definition.length > 200 ? definition.slice(0, 200) + '...' : definition,
        });
      }
    }
  }

  return terms.slice(0, 20);
}

export function generateMCQs(text: string, count = 5): { question: string; options: string[]; correct: number }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = splitSentences(trimmed);
  if (sentences.length < 2) return [];

  const freq = wordFrequency(tokenize(trimmed));
  const allWords = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const contentWords = allWords.filter(([w]) => !STOP_WORDS.has(w) && w.length > 3);
  const mcqs: { question: string; options: string[]; correct: number }[] = [];

  const distractorPool = contentWords.map(([w]) => w);

  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const sorted = sentences.map((s, idx) => ({
      sentence: s,
      score: sentenceScore(s, freq) + (idx === 0 ? 0.3 : idx === sentences.length - 1 ? 0.2 : 0),
      index: idx,
    })).sort((a, b) => b.score - a.score);

    const bestSentence = sorted[i % sorted.length].sentence;
    const words = tokenize(bestSentence).filter(w => !STOP_WORDS.has(w) && w.length > 3);

    if (words.length === 0) continue;

    const keyWord = words[Math.floor(Math.random() * words.length)];
    const questionText = bestSentence.replace(
      new RegExp(`\\b${keyWord}\\b`, 'i'),
      '________'
    ).trim();

    if (!questionText.includes('________')) continue;

    const distractors = distractorPool
      .filter(w => w !== keyWord && w.length > 2)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(`option${distractors.length + 1}`);
    }

    const options = [keyWord, ...distractors.slice(0, 3)];
    const correctIndex = 0;

    for (let j = options.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [options[j], options[k]] = [options[k], options[j]];
    }

    const correctFinal = options.indexOf(keyWord);

    mcqs.push({
      question: capitalize(questionText),
      options: options.map(o => capitalize(o)),
      correct: correctFinal,
    });
  }

  return mcqs;
}

export function generateTrueFalse(text: string, count = 5): { statement: string; answer: boolean }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) return [];

  const freq = wordFrequency(tokenize(trimmed));
  const sorted = sentences
    .map(s => ({ sentence: s, score: sentenceScore(s, freq) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count * 2);

  const results: { statement: string; answer: boolean }[] = [];

  for (const { sentence } of sorted) {
    if (results.length >= count) break;
    const clean = cleanSentence(sentence);
    if (clean.length < 15) continue;

    const isTrue = Math.random() > 0.35;

    if (isTrue) {
      results.push({ statement: clean, answer: true });
    } else {
      const words = tokenize(clean);
      const contentWords = words.filter(w => !STOP_WORDS.has(w) && w.length > 3);
      if (contentWords.length === 0) {
        results.push({ statement: clean, answer: true });
        continue;
      }

      const targetWord = contentWords[Math.floor(Math.random() * contentWords.length)];
      const synonyms = findSimilarWord(targetWord);
      const replacement = synonyms.length > 0
        ? synonyms[Math.floor(Math.random() * synonyms.length)]
        : 'incorrect';

      const falseStatement = clean.replace(
        new RegExp(`\\b${targetWord}\\b`, 'i'),
        replacement
      );
      results.push({ statement: falseStatement, answer: false });
    }
  }

  return results;
}

function findSimilarWord(word: string): string[] {
  const groups: string[][] = [
    ['increase', 'decrease', 'reduce', 'expand', 'shrink', 'grow'],
    ['positive', 'negative', 'neutral', 'active', 'passive'],
    ['cause', 'prevent', 'avoid', 'allow', 'block'],
    ['major', 'minor', 'significant', 'insignificant', 'primary', 'secondary'],
    ['improve', 'worsen', 'maintain', 'reduce', 'enhance', 'diminish'],
    ['accept', 'reject', 'deny', 'confirm', 'support', 'oppose'],
    ['always', 'never', 'sometimes', 'rarely', 'often', 'seldom'],
    ['similar', 'different', 'identical', 'distinct', 'comparable'],
    ['begin', 'end', 'continue', 'pause', 'resume', 'stop'],
    ['all', 'none', 'some', 'many', 'few', 'most'],
    ['higher', 'lower', 'greater', 'lesser', 'equal', 'unequal'],
    ['fast', 'slow', 'quick', 'rapid', 'gradual', 'sudden'],
    ['important', 'trivial', 'minor', 'major', 'crucial', 'optional'],
    ['before', 'after', 'during', 'while', 'since', 'until'],
    ['more', 'less', 'fewer', 'additional', 'reduced', 'excess'],
  ];

  const lower = word.toLowerCase();
  for (const group of groups) {
    if (group.includes(lower)) {
      return group.filter(w => w !== lower);
    }
  }

  return [];
}

export function generateFlashcards(text: string, count = 6): { front: string; back: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const cards: { front: string; back: string }[] = [];

  const sentences = splitSentences(trimmed);
  const freq = wordFrequency(tokenize(trimmed));
  const contentWords = getTopWords(freq, 20);

  for (const word of contentWords) {
    if (cards.length >= count) break;
    const capitalized = capitalize(word);

    const relatedSentences = sentences.filter(s =>
      s.toLowerCase().includes(word.toLowerCase())
    );

    if (relatedSentences.length > 0) {
      const best = relatedSentences[0];
      const definition = cleanSentence(best);
      cards.push({
        front: `What is "${capitalized}"?`,
        back: definition.length > 200 ? definition.slice(0, 200) + '...' : definition,
      });
    }
  }

  const importantSentences = sentences
    .map(s => ({ sentence: s, score: sentenceScore(s, freq) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  for (const { sentence } of importantSentences) {
    if (cards.length >= count) break;
    const clean = cleanSentence(sentence);
    const words = tokenize(clean).filter(w => !STOP_WORDS.has(w) && w.length > 3);
    if (words.length === 0) continue;

    const keyWord = words[Math.floor(Math.random() * words.length)];
    const question = clean.replace(
      new RegExp(`\\b${keyWord}\\b`, 'i'),
      '[...]'
    );

    if (question.includes('[...]')) {
      cards.push({
        front: question,
        back: capitalize(keyWord),
      });
    }
  }

  if (cards.length < count && sentences.length > 0) {
    for (const sentence of sentences) {
      if (cards.length >= count) break;
      const clean = cleanSentence(sentence);
      if (clean.length < 20) continue;
      const words = clean.split(/\s+/);
      if (words.length < 5) continue;
      const secondHalf = words.slice(Math.floor(words.length / 2)).join(' ');
      const firstHalf = words.slice(0, Math.floor(words.length / 2)).join(' ');
      if (!cards.some(c => c.front === firstHalf)) {
        cards.push({ front: firstHalf, back: secondHalf });
      }
    }
  }

  return cards.slice(0, count);
}

export function generateQuiz(text: string): { questions: (MCQ | TrueFalse)[] } {
  const mcqs = generateMCQs(text, 3);
  const tfs = generateTrueFalse(text, 3);
  const questions: (MCQ | TrueFalse)[] = [];

  let mi = 0, ti = 0;
  for (let i = 0; i < mcqs.length + tfs.length; i++) {
    if (i % 2 === 0 && mi < mcqs.length) {
      questions.push(mcqs[mi++]);
    } else if (ti < tfs.length) {
      questions.push(tfs[ti++]);
    } else if (mi < mcqs.length) {
      questions.push(mcqs[mi++]);
    }
  }

  return { questions };
}

export function generateStudyPlan(
  topics: string[],
  hoursPerDay: number,
  daysAvailable: number
): { day: number; topics: string[]; duration: number }[] {
  if (topics.length === 0 || daysAvailable <= 0) return [];

  const plan: StudyPlanDay[] = [];
  const totalHours = hoursPerDay * daysAvailable;
  const totalTopics = topics.length;
  const hoursPerTopic = totalHours / totalTopics;

  let topicIndex = 0;
  let hoursAssigned = 0;

  for (let day = 1; day <= daysAvailable; day++) {
    const dayTopics: string[] = [];
    let dayHours = 0;

    while (topicIndex < totalTopics && dayHours < hoursPerDay) {
      const remaining = hoursPerDay - dayHours;
      const topicHours = Math.min(remaining, hoursPerTopic - hoursAssigned);

      if (topicHours > 0) {
        dayTopics.push(topics[topicIndex]);
        dayHours += topicHours;
        hoursAssigned += topicHours;

        if (hoursAssigned >= hoursPerTopic) {
          topicIndex++;
          hoursAssigned = 0;
        }
      } else {
        break;
      }
    }

    if (dayTopics.length === 0 && topicIndex < totalTopics) {
      dayTopics.push(topics[topicIndex]);
      dayHours = Math.min(hoursPerDay, hoursPerTopic);
      hoursAssigned += dayHours;
      if (hoursAssigned >= hoursPerTopic) {
        topicIndex++;
        hoursAssigned = 0;
      }
    }

    plan.push({
      day,
      topics: [...new Set(dayTopics)],
      duration: Math.round(dayHours * 10) / 10,
    });
  }

  while (topicIndex < totalTopics) {
    const lastDay = plan[plan.length - 1];
    if (lastDay) {
      lastDay.topics.push(topics[topicIndex]);
      lastDay.duration = Math.min(lastDay.duration + hoursPerTopic, hoursPerDay);
    }
    topicIndex++;
  }

  return plan;
}

export function generateMindMap(text: string): { central: string; branches: { topic: string; items: string[] }[] } {
  const trimmed = text.trim();
  if (!trimmed) return { central: '', branches: [] };

  const freq = wordFrequency(tokenize(trimmed));
  const topWords = getTopWords(freq, 5);
  const central = topWords.length > 0 ? capitalize(topWords[0]) : 'Main Topic';

  const sentences = splitSentences(trimmed);
  const branches: { topic: string; items: string[] }[] = [];

  const branchWords = topWords.slice(1, 6);
  for (const bw of branchWords) {
    const relatedSentences = sentences.filter(s =>
      s.toLowerCase().includes(bw.toLowerCase())
    );
    const items = relatedSentences
      .slice(0, 3)
      .map(s => {
        const cleaned = cleanSentence(s);
        const words = cleaned.split(/\s+/);
        return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : cleaned;
      });

    if (items.length > 0) {
      branches.push({ topic: capitalize(bw), items });
    }
  }

  if (branches.length === 0 && sentences.length > 0) {
    const chunks: string[][] = [];
    const chunkSize = Math.ceil(sentences.length / 4);
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize));
    }

    for (let i = 0; i < Math.min(4, chunks.length); i++) {
      const chunk = chunks[i];
      const chunkFreq = wordFrequency(tokenize(chunk.join(' ')));
      const topicWord = getTopWords(chunkFreq, 1);
      const topic = topicWord.length > 0 ? capitalize(topicWord[0]) : `Branch ${i + 1}`;
      const items = chunk.slice(0, 3).map(s => {
        const cleaned = cleanSentence(s);
        return cleaned.length > 60 ? cleaned.slice(0, 60) + '...' : cleaned;
      });
      branches.push({ topic, items });
    }
  }

  return { central, branches };
}

export function summarizeMarkdown(text: string): string {
  const stripped = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---+/gm, '')
    .replace(/\|[^|]+\|/g, '')
    .replace(/^\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return summarizeText(stripped);
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv') || name.endsWith('.json')) {
    return file.text();
  }

  if (name.endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdfjs = pdfjsLib as typeof import('pdfjs-dist');
      if ('GlobalWorkerOptions' in pdfjs) {
        (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
          new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ');
        text += pageText + '\n\n';
      }
      return text.trim();
    } catch {
      return `[PDF file: ${file.name}]\nUnable to extract text. Please copy and paste the content manually.`;
    }
  }

  if (name.endsWith('.doc') || name.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let text = '';
      for (let i = 0; i < uint8.length - 1; i++) {
        const charCode = uint8[i];
        if (charCode >= 32 && charCode <= 126) {
          text += String.fromCharCode(charCode);
        } else if (charCode === 10 || charCode === 13) {
          text += '\n';
        }
      }
      const cleaned = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '  ').trim();
      if (cleaned.length > 50) {
        return cleaned;
      }
      return `[Word document: ${file.name}]\nUnable to fully extract text. Please copy and paste the content manually.`;
    } catch {
      return `[Word document: ${file.name}]\nUnable to extract text. Please copy and paste the content manually.`;
    }
  }

  if (name.endsWith('.ppt') || name.endsWith('.pptx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let text = '';
      for (let i = 0; i < uint8.length - 1; i++) {
        const charCode = uint8[i];
        if (charCode >= 32 && charCode <= 126) {
          text += String.fromCharCode(charCode);
        } else if (charCode === 10 || charCode === 13) {
          text += '\n';
        }
      }
      const cleaned = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '  ').trim();
      if (cleaned.length > 50) {
        return cleaned;
      }
      return `[PowerPoint: ${file.name}]\nUnable to fully extract text. Please copy and paste the content manually.`;
    } catch {
      return `[PowerPoint: ${file.name}]\nUnable to extract text. Please copy and paste the content manually.`;
    }
  }

  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_csv(sheet);
        if (sheetText.trim()) {
          text += `--- ${sheetName} ---\n${sheetText}\n\n`;
        }
      }
      return text.trim() || `[Excel file: ${file.name}]\nNo text content found.`;
    } catch {
      return `[Excel file: ${file.name}]\nUnable to extract text.`;
    }
  }

  if (file.type.startsWith('text/')) {
    return file.text();
  }

  return `[File: ${file.name}]\nFile type (${file.type || 'unknown'}) is not directly supported for text extraction. Please copy and paste the content manually.`;
}
