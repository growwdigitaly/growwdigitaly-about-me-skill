/* The interview steps, in order. Question wording is fixed.
   "n" is a stable id used for saving answers, so it does not change when steps are added or removed.
   The step number shown on screen is the position in this list. */
window.ABOUT_ME_QUESTIONS = [
  { n: 1, section: "Basic details", label: "Name, role and company",
    text: "What's your full name, current job title and company?" },
  { n: 2, section: "Basic details", label: "Location, origins and education",
    text: "Where are you based, where are you originally from, and what's your educational background, including any key qualifications? If you've relocated, when and why did you move?" },
  { n: 3, section: "Basic details", label: "Links",
    text: "Paste any links you'd like included: LinkedIn, personal website, portfolio, published work.", placeholder: "One link per line" },
  { n: 4, section: "Basic details", label: "Preferred English", type: "choice",
    text: "Which English would you like your profile written in? (British or American)",
    options: [ { value: "British", label: "British English" }, { value: "American", label: "American English" } ] },

  { n: 5, section: "Personal life and interests", label: "Family and closest people",
    text: "Tell me about your family and who you're closest to. Has anyone in your personal life shaped how you work or think?" },
  { n: 6, section: "Personal life and interests", label: "A good day off",
    text: "What does a good day off look like for you?" },
  { n: 7, section: "Personal life and interests", label: "Life outside work",
    text: "What do you love doing outside work, and what does it reveal about you that people at work might not see? Include any cultural traditions or languages that are part of who you are." },

  { n: 8, section: "Working style", label: "How I work",
    text: "How would close colleagues describe you, when do you do your best work, and what belief guides your approach?" },

  { n: 9, section: "Career", label: "Career from the beginning",
    text: "Walk me through your career from the beginning. What were the real turning points?" },
  { n: 10, section: "Career", label: "How I got into my field",
    text: "How did you end up in your current field, and what did you have to unlearn along the way?" },

  { n: 11, section: "Wins", label: "The project I'm proudest of", kind: "Win", moreCases: true,
    text: "Walk me through the project or campaign you're proudest of, start to finish. What was the brief, what were the starting numbers, what did you do, and where did it land?" },
  { n: 12, section: "Wins", label: "The win that surprised me most", kind: "Win", moreCases: true,
    text: "Which win surprised you most, something that worked far better than you expected? Why do you think it did?" },
  { n: 13, section: "Wins", label: "A constraint that forced creativity", kind: "Win", moreCases: true,
    text: "Tell me about a time a small budget or tight constraint forced you to get creative. What was the constraint, what did you do differently, and what was the payoff?" },
  { n: 14, section: "Wins", label: "When the data changed my course", kind: "Win", moreCases: true,
    text: "Was there a moment the data told you to change course mid-project? What did the numbers say, what did you switch, and what happened after?" },

  { n: 15, section: "Failures", label: "A project or decision that didn't work out", kind: "Failure", moreCases: true,
    text: "Tell me about a project or decision that didn't work out, or a mistake you still think about. What happened, what did it cost you, and what would you do differently now?" },
  { n: 16, section: "Failures", label: "A time I walked away", kind: "Failure", moreCases: true,
    text: "Was there ever a moment you had to admit something wasn't working and walk away or shut it down? How did you make that call, and how did it feel?" },

  /* Repeatable block: any number of case studies or experiments, successful or not. */
  { n: "cases", type: "cases", section: "Case studies and experiments", label: "Case studies and experiments", moreCases: true,
    text: "Add the case studies and experiments you have run. They can be successes, failures, or a bit of both. Add as many as you like." },

  { n: 18, section: "Career changes and setbacks", label: "A redundancy or major setback", kind: "Setback", moreCases: true,
    text: "Tell me about a redundancy or major setback. How did you find out, what did the next few weeks really look like, and what pulled you out of the low point?" },

  { n: 19, section: "Motivation", label: "What kept me going",
    text: "When things were hardest, what specifically kept you going? What did you tell yourself?" },
  { n: 20, section: "Motivation", label: "Who or what helped me rebuild",
    text: "Who or what has been most important in helping you rebuild: a community, a mentor, a habit, family?" },

  { n: 21, section: "Voice and writing style", label: "How I write and speak",
    text: "How would you describe the way you write or speak: formal, casual, story-driven, direct, something else?" },
  { n: 22, section: "Voice and writing style", label: "My words, and what I never want to sound like",
    text: "Are there words, phrases, or expressions you use a lot that feel like you? And is there anything you never want your content to sound like: words, tones, or clichés that make you cringe?" }
];
