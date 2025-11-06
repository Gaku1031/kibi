// Comprehendカスタム分類用の学習データ生成スクリプト
// プルチックの感情の輪に基づく8種類の感情の英語例文
// Comprehendの推奨: 最低100サンプル/クラス、推奨1000サンプル/クラス

const emotionTemplates = {
  joy: {
    base: [
      "I am so happy today! Everything is going perfectly.",
      "This is the best day of my life! I feel amazing.",
      "I'm filled with happiness and joy right now.",
      "What a wonderful surprise! I'm absolutely delighted.",
      "I feel so cheerful and optimistic about everything.",
      "This brings me so much joy and satisfaction.",
      "I'm beaming with happiness and can't stop smiling.",
      "Life is beautiful and I'm grateful for this moment.",
      "I feel euphoric and incredibly blessed today.",
      "My heart is full of joy and contentment.",
      "I just received the best news ever!",
      "I'm radiating with happiness and positive energy.",
      "This moment fills me with pure joy.",
      "I feel like dancing and celebrating!",
      "Everything is falling into place perfectly.",
      "I'm overjoyed beyond words right now.",
      "This brings a huge smile to my face.",
      "I feel lighter and happier than ever before.",
      "My heart is singing with happiness.",
      "I'm grateful for all these wonderful moments.",
    ],
    variations: [
      "feeling absolutely wonderful",
      "experiencing pure bliss",
      "overflowing with happiness",
      "filled with excitement and joy",
      "delighted beyond measure",
      "ecstatic about everything",
      "thrilled to the core",
      "enjoying every single moment",
      "celebrating this amazing time",
      "grateful for this happiness",
    ]
  },

  trust: {
    base: [
      "I have complete confidence in this decision.",
      "I trust that everything will work out for the best.",
      "I feel secure and safe in this environment.",
      "I have faith in the process and the outcome.",
      "I believe in myself and my abilities completely.",
      "I trust my instincts and feel confident moving forward.",
      "I feel a deep sense of reliability and dependability.",
      "I have unwavering faith in this relationship.",
      "I trust the journey even when I can't see the path.",
      "I feel assured and certain about this choice.",
      "I believe this is the right direction.",
      "I feel confident and secure in my decision.",
      "I trust the process wholeheartedly.",
      "I have complete faith in what's unfolding.",
      "I feel safe and protected here.",
      "I trust in the goodness of people around me.",
      "I believe in the strength of our connection.",
      "I feel certain about the path ahead.",
      "I have confidence in the future.",
      "I trust my judgment completely.",
    ],
    variations: [
      "feeling secure and confident",
      "trusting the process completely",
      "having faith in the outcome",
      "believing in the best",
      "feeling safe and protected",
      "confident in my choices",
      "certain about the direction",
      "assured of the results",
      "believing in myself fully",
      "trusting others deeply",
    ]
  },

  fear: {
    base: [
      "I'm terrified of what might happen next.",
      "This situation fills me with dread and anxiety.",
      "I feel scared and uncertain about the future.",
      "My heart is racing with fear and worry.",
      "I'm afraid I won't be able to handle this.",
      "This makes me feel vulnerable and frightened.",
      "I'm overwhelmed with panic and terror.",
      "I feel anxious and apprehensive about tomorrow.",
      "Fear is consuming my thoughts right now.",
      "I'm worried sick about the potential consequences.",
      "I can't shake this feeling of impending doom.",
      "I'm paralyzed by fear and uncertainty.",
      "This situation terrifies me to my core.",
      "I feel like something bad is about to happen.",
      "My anxiety is through the roof.",
      "I'm scared and don't know what to do.",
      "This fills me with worry and distress.",
      "I'm trembling with fear.",
      "I feel unsafe and threatened.",
      "My mind is racing with fearful thoughts.",
    ],
    variations: [
      "feeling terrified and anxious",
      "overwhelmed with dread",
      "scared beyond belief",
      "consumed by worry",
      "feeling threatened and unsafe",
      "paralyzed by fear",
      "filled with panic",
      "dreading the outcome",
      "anxious about everything",
      "feeling vulnerable and afraid",
    ]
  },

  surprise: {
    base: [
      "I never expected this to happen! What a shock!",
      "This caught me completely off guard.",
      "I'm amazed and astonished by this turn of events.",
      "What an unexpected and surprising development!",
      "I'm stunned and bewildered by this news.",
      "This is so surprising, I can hardly believe it.",
      "I'm taken aback by this unexpected revelation.",
      "What a startling and unforeseen circumstance!",
      "I'm flabbergasted by this surprising outcome.",
      "This has left me speechless and amazed.",
      "I didn't see that coming at all!",
      "This is completely unexpected!",
      "I'm shocked beyond words.",
      "What a twist of events!",
      "This took me by complete surprise.",
      "I'm astounded by what just happened.",
      "This is unbelievable!",
      "I never imagined this would occur.",
      "What an amazing surprise!",
      "I'm totally caught off guard.",
    ],
    variations: [
      "completely shocked and amazed",
      "taken by surprise",
      "astonished beyond belief",
      "caught off guard entirely",
      "stunned by the revelation",
      "bewildered and amazed",
      "flabbergasted by the news",
      "surprised in the best way",
      "shocked at the turn of events",
      "amazed by what happened",
    ]
  },

  sadness: {
    base: [
      "I feel so sad and heartbroken right now.",
      "This situation brings me deep sorrow and grief.",
      "I'm overwhelmed with melancholy and despair.",
      "My heart aches with sadness and loss.",
      "I feel dejected and downhearted about everything.",
      "This fills me with profound sadness and regret.",
      "I'm feeling blue and emotionally drained today.",
      "Sorrow weighs heavily on my heart right now.",
      "I feel mournful and deeply disappointed.",
      "This brings tears to my eyes and sadness to my soul.",
      "I can't stop feeling down and depressed.",
      "Everything seems so hopeless right now.",
      "I'm grieving this loss deeply.",
      "My heart feels heavy with sorrow.",
      "I feel empty and sad inside.",
      "This disappointment cuts deep.",
      "I'm struggling with these feelings of sadness.",
      "I feel so lonely and blue.",
      "This makes me want to cry.",
      "I'm overwhelmed by feelings of loss.",
    ],
    variations: [
      "feeling deeply sorrowful",
      "overwhelmed with grief",
      "heartbroken and sad",
      "consumed by melancholy",
      "feeling down and blue",
      "depressed and dejected",
      "mourning the loss",
      "filled with regret and sadness",
      "emotionally drained",
      "experiencing profound sorrow",
    ]
  },

  disgust: {
    base: [
      "This is absolutely revolting and repulsive.",
      "I find this behavior completely disgusting.",
      "This makes me feel sick to my stomach.",
      "I'm repelled and nauseated by this situation.",
      "This is so gross and offensive to me.",
      "I feel disgusted and appalled by what I've seen.",
      "This is utterly repugnant and distasteful.",
      "I'm revolted by this unacceptable behavior.",
      "This makes me feel queasy and uncomfortable.",
      "I find this absolutely abhorrent and vile.",
      "This is repulsive on every level.",
      "I'm sickened by what I witnessed.",
      "This behavior is completely unacceptable.",
      "I feel contaminated by this experience.",
      "This is nauseating and offensive.",
      "I'm repelled by these actions.",
      "This violates my sense of decency.",
      "I find this morally repugnant.",
      "This is distasteful and wrong.",
      "I'm disgusted beyond words.",
    ],
    variations: [
      "feeling completely disgusted",
      "repelled and nauseated",
      "sickened by the sight",
      "revolted beyond belief",
      "finding it abhorrent",
      "disgusted and appalled",
      "feeling contaminated",
      "repulsed by the behavior",
      "nauseated and uncomfortable",
      "finding it utterly repugnant",
    ]
  },

  anger: {
    base: [
      "I'm furious and absolutely livid about this!",
      "This makes me so angry I can barely contain myself.",
      "I'm outraged and infuriated by this injustice.",
      "I feel intense rage and frustration right now.",
      "This situation makes my blood boil with anger.",
      "I'm seething with fury and indignation.",
      "I feel hostile and aggressive towards this problem.",
      "This fills me with wrath and burning anger.",
      "I'm incensed and enraged by this treatment.",
      "My anger is overwhelming and all-consuming.",
      "I can't believe how angry this makes me!",
      "I'm fed up and furious with this situation.",
      "This injustice makes me see red.",
      "I'm boiling with rage inside.",
      "I feel like exploding with anger.",
      "This is absolutely infuriating!",
      "I'm enraged by this disrespect.",
      "My patience has completely run out.",
      "I'm burning with fury and frustration.",
      "This makes me want to scream with anger.",
    ],
    variations: [
      "feeling absolutely furious",
      "seething with rage",
      "consumed by anger",
      "infuriated beyond words",
      "boiling with frustration",
      "enraged and hostile",
      "livid with anger",
      "burning with fury",
      "outraged by the injustice",
      "incensed and indignant",
    ]
  },

  anticipation: {
    base: [
      "I'm so excited and eager for what's coming next!",
      "I can hardly wait to see what happens tomorrow.",
      "I'm filled with anticipation and expectation.",
      "I'm looking forward to this with great enthusiasm.",
      "I feel hopeful and optimistic about the future.",
      "I'm buzzing with excitement and anticipation.",
      "I can't wait to experience what's ahead.",
      "I'm eagerly awaiting the next chapter of my life.",
      "I feel energized and excited about new possibilities.",
      "I'm thrilled about the upcoming opportunities.",
      "I'm counting down the days with excitement.",
      "I'm so eager to see how this unfolds.",
      "I'm full of hope for what's coming.",
      "I'm anticipating amazing things ahead.",
      "I can barely contain my excitement!",
      "I'm ready and eager for the next step.",
      "I'm optimistic about future possibilities.",
      "I'm looking forward with great expectation.",
      "I'm excited about what tomorrow brings.",
      "I'm filled with hopeful anticipation.",
    ],
    variations: [
      "eagerly anticipating",
      "excited about the future",
      "looking forward with hope",
      "buzzing with expectation",
      "filled with eager energy",
      "anticipating with enthusiasm",
      "hopeful about what's next",
      "ready for new opportunities",
      "optimistic about tomorrow",
      "thrilled for what's coming",
    ]
  }
};

// 文章のバリエーションを生成する関数
function generateVariations(base, variations) {
  const sentences = [...base];

  // ベース文章と variation を組み合わせて新しい文章を生成
  for (const variation of variations) {
    sentences.push(`I'm ${variation} right now.`);
    sentences.push(`Today I'm ${variation}.`);
    sentences.push(`I find myself ${variation}.`);
    sentences.push(`Currently ${variation} about the situation.`);
    sentences.push(`I've been ${variation} lately.`);
  }

  return sentences;
}

// さらに文章を拡充する関数
function expandSentences(sentences, targetCount = 150) {
  const expanded = [...sentences];
  const prefixes = ["Today, ", "Right now, ", "At this moment, ", "Currently, ", "I must say, ", "Honestly, ", "To be frank, ", "I feel that ", "It's clear that "];
  const suffixes = [" It's overwhelming.", " I can't help it.", " This is how I truly feel.", " There's no doubt about it.", " I'm certain of this.", " This feeling is intense.", " I need to acknowledge this.", " This is undeniable."];

  let idx = 0;
  while (expanded.length < targetCount && idx < sentences.length) {
    const sentence = sentences[idx % sentences.length];
    if (expanded.length < targetCount) {
      expanded.push(prefixes[idx % prefixes.length] + sentence.charAt(0).toLowerCase() + sentence.slice(1));
    }
    if (expanded.length < targetCount) {
      expanded.push(sentence + suffixes[idx % suffixes.length]);
    }
    idx++;
  }

  return expanded;
}

// 全ての感情データを生成
const emotions = {};
for (const [emotion, data] of Object.entries(emotionTemplates)) {
  const sentences = generateVariations(data.base, data.variations);
  emotions[emotion] = expandSentences(sentences, 150);
}

// CSV形式で出力（Comprehend用）
// AWS Comprehendの要件:
// - ヘッダー行なし
// - フォーマット: label,text (ラベルが最初の列)
function generateCSV() {
  let csv = "";  // ヘッダーなし

  for (const [emotion, sentences] of Object.entries(emotions)) {
    for (const sentence of sentences) {
      // 改行を削除し、クリーンアップ
      const cleanedSentence = sentence
        .replace(/\r?\n/g, ' ')  // 改行を空白に置換
        .replace(/\s+/g, ' ')    // 連続する空白を1つに
        .trim()                   // 前後の空白を削除
        .replace(/,/g, ';');     // カンマをセミコロンに置換（CSV区切り文字との衝突を避ける）

      // Comprehend形式: label,text (ラベルが最初)
      csv += `${emotion},${cleanedSentence}\n`;
    }
  }

  return csv;
}

// ファイル出力
const fs = require('fs');
const csv = generateCSV();

fs.writeFileSync('./emotion-training-data.csv', csv);
console.log('Training data generated: emotion-training-data.csv');
console.log(`Total samples: ${Object.values(emotions).flat().length}`);
console.log('Emotion distribution:');
for (const [emotion, sentences] of Object.entries(emotions)) {
  console.log(`  ${emotion}: ${sentences.length} samples`);
}
console.log('\nNote: This dataset provides a good baseline for Comprehend Custom Classification.');
console.log('Minimum required: 100 samples per class');
console.log('Recommended: 1000+ samples per class');
console.log('Current dataset: 150 samples per class');
