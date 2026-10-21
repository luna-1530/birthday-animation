// EDIT ME: all text, dates, captions and asset paths live here.
export const CONFIG = {
  opening: {
    start: "Happy birthday to you...",
    cake: [ // Phase A: she catches him, teases him
      ["girl", "Osborneeee! Is that cake more important than your own birthday song?", 4200],
      ["osb", "I'm listening, babe.", 2200],
      ["girl", "With your eyes on the cake?", 2400],
      ["osb", "I can multitask.", 2000],
      ["girl", "Of course you can. Six feet seven inches of pure audacity.", 3800],
    ],
    song: ["Happy birthday to you...", "Happy birthday to you...", "Happy birthday dear Osborne...", "Happy birthday to you!"], // Phase B (melody in main.js SONG)
    love: ["Happy birthday, Poochie.", "I love you.", "You may now eat your cake."], // Phase C
  },
  ghostLine: "Hehehehe. NICE TRY. WATCH IT. 👻",
  letter: { voice: null /* e.g. "assets/audio/my-voice.mp3" */,
    text: "Osborne,\n\nHappy birthday. I wrote this letter because I wanted you to have something to keep.\nThank you for the chess, the teasing, and for being the tallest person I know.\n\nNow go explore the memories. Then — a challenge awaits.\n\n— Me" },
  memories: [ // type: image|video|note|star|piece|keepsake ; src null = generated placeholder
    { type: "image", src: null, date: "Replace me · Date 1", caption: "Placeholder memory — put your photo in assets/images", hidden: null, pos: [-3.2, 1, -1] },
    { type: "image", src: null, date: "Replace me · Date 2", caption: "Another placeholder photograph", hidden: null, pos: [3, 0.2, -2] },
    { type: "video", src: "assets/videos/memory1.mp4", date: "Replace me · Date 3", caption: "Placeholder video (add assets/videos/memory1.mp4)", hidden: null, pos: [0.2, 1.6, -3.5] },
    { type: "star", hidden: "You're lucky I think you're this cute. Don't let it go to your head. ⭐", pos: [-1.2, 2.2, 0.2] },
    { type: "note", hidden: "Inside joke goes here. (Edit me in config.js) 📝", pos: [1.8, -0.4, 0.6] },
    { type: "piece", hidden: "Yes, I know. You'd rather be looking at a chessboard right now. ♟️", pos: [-2.4, -0.6, 0.2] },
    { type: "keepsake", hidden: "A little keepsake, a little message: you're stuck with me. 💛", pos: [2.8, 2, 0.4] },
  ],
  chess: {
    // Scholar's mate from the real start position. Player = White.
    player: [["e2","e4"],["f1","c4"],["d1","h5"],["h5","f7"]],
    black: ["e7e5", "b8c6", "g8f6"],
    messages: [
      "One move in and you're already feeling like Magnus Carlsen.\n\nPoochie, please. The birthday boy has barely started. 😂",
      "Mikhail Tal would appreciate the ambition.\n\nI, however, am watching you very closely, Mr. Chess Genius. ♟️",
      "Look at you concentrating like the fate of the universe depends on this board.\n\nRelax, tall boy. Your girlfriend is still the biggest distraction in your life. 😌❤️",
    ],
    finale: ["CHECKMATE!", "You thought you were playing for a chess achievement?", "HAHAHAHA.", "Congratulations, Osborne.\n\nYour actual birthday gift is...", "ME. 😂❤️", "Congratulations, your gift is me!"],
  },
  ending: [ // 0-3 hug setup | 4-9 sweet message | 10 dance ask | 11 Osborne's answer
    ["girl","Come here. Hug."],["osb","Hm. I don't think so."],["girl","...Fine."],["osb","Okay, okay. Come here."],
    ["girl","You know something, Poochie?"],
    ["girl","I'm really happy I get to celebrate you."],
    ["girl","I hope this new year of your life brings you happiness, peace, beautiful opportunities, and so many reasons to smile."],
    ["girl","You deserve good things, Osborne."],
    ["girl","And I hope you never forget how special you are to me."],
    ["girl","I love you."],
    ["girl","So, Poochie... Are you finally going to show me your dancing skills?"],
    ["osb","Mmm... why not, babe?"],
  ],
  finalMessage: ["I love you soooo much, Osborne.", "Happy birthday, my love.", "Enjoy your day. ❤️"],
  voiceFiles: {}, // optional: exact line text -> your recording, e.g. "I love you.": "assets/audio/voice/i-love-you.mp3"
  audio: { song: [] /* 4 optional files for the 4 song lines */, music: null, dance: null /* e.g. "assets/audio/love-story.mp3" (you must own/licence it) */ },
};
