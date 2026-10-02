export type SeedStep = { title: string; body: string; stepFor: "BOTH" | "OLDER" | "YOUNGER" };
export type SeedActivity = { slug: string; title: string; summary: string; description: string; category: string; collection?: string; estimatedMinutes: number; difficulty: "EASY" | "MEDIUM" | "INVOLVED"; reflectionQuestion: string; isPremium?: boolean; featured?: boolean; steps: SeedStep[] };
export const activityCategories: { slug: string; name: string; description: string }[] = [
  { slug: "storytelling", name: "Storytelling", description: "Share memories and tales that connect generations through spoken word." },
  { slug: "music-and-media", name: "Music & Media", description: "Exchange favorite songs, shows, or clips and talk about what they mean to you." },
  { slug: "skills-swap", name: "Skills Swap", description: "Teach each other a hobby, trick, or talent you enjoy and try it together." },
  { slug: "family-history", name: "Family History", description: "Explore your family’s past by discussing events, people, and stories that shaped you." },
  { slug: "games-and-play", name: "Games & Play", description: "Enjoy lighthearted games and playful activities that spark laughter and conversation." }
];
export const collections: { slug: string; title: string; description: string; monthOffset: number; isPremium: boolean }[] = [
  { slug: "kitchen-table-stories", title: "Kitchen Table Stories", description: "This month's collection gathers activities centered around food, memories, and sharing stories at the table.", monthOffset: 0, isPremium: false },
  { slug: "sounds-of-our-lives", title: "Sounds of Our Lives", description: "Next month's collection explores music, playlists, and the sounds that mark our personal histories.", monthOffset: 1, isPremium: true },
  { slug: "roots-and-branches", title: "Roots and Branches", description: "Last month's collection focuses on family timelines, maps, and the places that root us.", monthOffset: -1, isPremium: false }
];
export const activities: SeedActivity[] = [
  {
    slug: "then-vs-now",
    title: "Then vs. Now",
    summary: "Compare life then and now through shared stories and pictures.",
    description: "Older adult shares a memory from their youth, describing daily life, technology, and culture. Younger adult shares what their day looks like today. Together they note similarities and differences, reflecting on how times have changed.",
    category: "storytelling",
    estimatedMinutes: 20,
    difficulty: "EASY",
    reflectionQuestion: "What surprised you most about how daily life has changed between your generations?",
    featured: true,
    steps: [
      { title: "Older adult shares a youth memory", stepFor: "OLDER", body: "Pick a photo or memory from your youth and describe what daily life was like back then." },
      { title: "Younger adult shares today's routine", stepFor: "YOUNGER", body: "Show a recent photo or describe a typical day now, including school, hobbies, and tech you use." },
      { title: "Find similarities", stepFor: "BOTH", body: "Talk about what feels similar between the two eras—values, habits, or favorite pastimes." },
      { title: "Note differences", stepFor: "BOTH", body: "Highlight what feels different, such as technology, fashion, or how people communicate." },
      { title: "Exchange era wishes", stepFor: "BOTH", body: "Each share one thing you’d like to try from the other's time and why it appeals to you." }
    ]
  },
  {
    slug: "teach-me-something",
    title: "Teach Me Something",
    summary: "Each person teaches the other a skill or hobby they love, sharing tips and trying it together.",
    description: "Older adult shows a skill they know, like knitting, gardening, or a card game. Younger adult shows a skill they know, like a dance move, video game trick, or coding basics. They practice together and give feedback.",
    category: "skills-swap",
    estimatedMinutes: 30,
    difficulty: "EASY",
    reflectionQuestion: "What did you enjoy learning from each other, and how did it feel to be both teacher and student?",
    steps: [
      { title: "Older adult teaches a skill", stepFor: "OLDER", body: "Show the younger adult how to do your chosen skill, explaining each step clearly." },
      { title: "Younger adult teaches a skill", stepFor: "YOUNGER", body: "Show the older adult how to do your chosen skill, breaking it down into simple actions." },
      { title: "Try the older adult's skill", stepFor: "BOTH", body: "Together practice the older adult's skill, helping each other and having fun." },
      { title: "Try the younger adult's skill", stepFor: "BOTH", body: "Together practice the younger adult's skill, offering encouragement and tips." },
      { title: "Reflect on teaching", stepFor: "BOTH", body: "Discuss what you liked about teaching and learning, and what you might want to learn next." }
    ]
  },
  {
    slug: "memory-lane",
    title: "Memory Lane",
    summary: "Older adult shares a cherished memory while younger adult asks questions to bring the story to life.",
    description: "Older adult selects a meaningful photo or object and tells the story behind it, including people, place, and feelings. Younger adult listens and asks follow‑up questions to dig deeper. Together they note what makes the memory special.",
    category: "storytelling",
    collection: "kitchen-table-stories",
    estimatedMinutes: 25,
    difficulty: "EASY",
    reflectionQuestion: "How did hearing this story change your view of your family's past?",
    featured: true,
    steps: [
      { title: "Older adult picks a memory", stepFor: "OLDER", body: "Choose a photo or object that holds a special memory and begin to tell its story." },
      { title: "Older adult adds details", stepFor: "OLDER", body: "Describe the people, place, time, and feelings connected to this memory." },
      { title: "Younger adult asks follow‑up", stepFor: "YOUNGER", body: "Ask two questions about the people involved or how the memory felt." },
      { title: "Younger adult asks deeper", stepFor: "YOUNGER", body: "Ask another question about what you learned or how it might relate to today." },
      { title: "Reflect on the story", stepFor: "BOTH", body: "Talk about what stood out and how the memory connects to your own lives now." }
    ]
  },
  {
    slug: "our-playlist",
    title: "Our Playlist",
    summary: "Create a shared playlist of songs that matter to each generation and talk about why they matter.",
    description: "Each person picks three songs that are meaningful to them—maybe from their youth, a special event, or just a favorite. They share the songs, explain the memories or feelings attached, and add them to a joint playlist. Finally they listen to a few tracks together.",
    category: "music-and-media",
    collection: "sounds-of-our-lives",
    estimatedMinutes: 30,
    difficulty: "EASY",
    reflectionQuestion: "Which song from the other's generation surprised you, and what did it reveal about their experiences?",
    featured: false,
    isPremium: true,
    steps: [
      { title: "Older adult picks songs", stepFor: "OLDER", body: "Choose three songs that are meaningful to you and name them." },
      { title: "Younger adult picks songs", stepFor: "YOUNGER", body: "Choose three songs that are meaningful to you and name them." },
      { title: "Older adult explains songs", stepFor: "OLDER", body: "For each of your songs, say why it matters and what memory or feeling it brings." },
      { title: "Younger adult explains songs", stepFor: "YOUNGER", body: "For each of your songs, say why it matters and what memory or feeling it brings." },
      { title: "Build and listen", stepFor: "BOTH", body: "Add all six songs to a shared playlist and listen to a couple of tracks together." }
    ]
  },
  {
    slug: "family-timeline",
    title: "Family Timeline",
    summary: "Build a simple timeline of important family events across generations.",
    description: "Together you list key moments—births, moves, marriages, achievements—placing them on a line drawn on paper or a digital tool. Each person adds events they know or have heard about, then discuss patterns and stories that emerge.",
    category: "family-history",
    collection: "roots-and-branches",
    estimatedMinutes: 35,
    difficulty: "MEDIUM",
    reflectionQuestion: "What story does the timeline tell about your family's journey through time?",
    steps: [
      { title: "Draw the timeline", stepFor: "BOTH", body: "Draw a horizontal line, mark the left end as the earliest known year and the right end as today." },
      { title: "Older adult adds past events", stepFor: "OLDER", body: "Add events from before you were born that you know, such as grandparents' immigration or marriages." },
      { title: "Younger adult adds recent events", stepFor: "YOUNGER", body: "Add events from your lifetime, like births, school milestones, or moves." },
      { title: "Fill gaps together", stepFor: "BOTH", body: "Discuss any missing pieces and ask each other for details you might not know." },
      { title: "Highlight a surprise", stepFor: "BOTH", body: "Each choose one event on the timeline that surprised you and explain why it stands out." }
    ]
  },
  {
    slug: "would-you-rather",
    title: "Would You Rather: Generations Edition",
    summary: "Play a fun game of would‑you‑rather questions that compare life then and now.",
    description: "Take turns asking would‑you‑rather questions that present two choices—one from the older generation's era and one from today. After each choice, explain why you picked it and what it reveals about values or lifestyle. Include six concrete example questions in the steps to get started.",
    category: "games-and-play",
    estimatedMinutes: 20,
    difficulty: "MEDIUM",
    reflectionQuestion: "Which choice revealed the biggest difference in values between your generations, and why?",
    steps: [
      { title: "Rotary phone vs smartphone", stepFor: "BOTH", body: "Would you rather have a rotary phone or a smartphone? Each choose, explain why, then discuss." },
      { title: "Handwritten letter vs text", stepFor: "BOTH", body: "Would you rather write a letter by hand or send a text? Each choose, explain why, then discuss." },
      { title: "Vinyl record vs streaming", stepFor: "BOTH", body: "Would you rather listen to music on a vinyl record or stream it? Each choose, explain why, then discuss." },
      { title: "Train vs plane travel", stepFor: "BOTH", body: "Would you rather travel by train for a cross‑country trip or fly? Each choose, explain why, then discuss." },
      { title: "Board game vs online video game", stepFor: "BOTH", body: "Would you rather play a board game with family or play an online video game? Each choose, explain why, then discuss." },
      { title: "Home‑cooked meal vs takeout", stepFor: "BOTH", body: "Would you rather cook a meal from scratch or order takeout? Each choose, explain why, then discuss." }
    ]
  },
  {
    slug: "photo-story",
    title: "Photo Story",
    summary: "Create a short story together using a selection of old and new photos.",
    description: "Each person chooses three photos—old family pictures or recent snapshots. Together you arrange them in order and narrate what’s happening, adding dialogue and feelings. The result is a short, collaborative story that blends past and present.",
    category: "storytelling",
    estimatedMinutes: 25,
    difficulty: "EASY",
    reflectionQuestion: "How did mixing old and new images change the way you saw the story?",
    steps: [
      { title: "Older adult selects old photos", stepFor: "OLDER", body: "Choose three old family photos and briefly describe what each shows." },
      { title: "Younger adult selects new photos", stepFor: "YOUNGER", body: "Choose three recent photos (selfies, events) and briefly describe what each shows." },
      { title: "Arrange the photos", stepFor: "BOTH", body: "Lay the six photos out in a sequence that tells a story from beginning to end." },
      { title: "Narrate each photo", stepFor: "BOTH", body: "Take turns telling what is happening in each photo, adding dialogue and feelings." },
      { title: "Reflect on the story", stepFor: "BOTH", body: "Talk about the story you created and what you liked about making it together." }
    ]
  },
  {
    slug: "recipe-swap",
    title: "Recipe Swap",
    summary: "Share a favorite recipe, talk about its origins, and try making it together.",
    description: "Older adult shares a cherished family recipe, explaining where it came from and any special tips. Younger adult shares a recipe they like, perhaps a modern twist or a snack. You pick one to prepare together, talk through the steps, and enjoy the result.",
    category: "skills-swap",
    collection: "kitchen-table-stories",
    estimatedMinutes: 45,
    difficulty: "MEDIUM",
    reflectionQuestion: "What did you learn about each other's tastes and traditions through the recipe you made together?",
    featured: true,
    steps: [
      { title: "Older adult shares recipe", stepFor: "OLDER", body: "Present your favorite recipe, name the dish, and say where it comes from." },
      { title: "Younger adult shares recipe", stepFor: "YOUNGER", body: "Present your favorite recipe, name the dish, and say why you like it." },
      { title: "Choose a recipe to cook", stepFor: "BOTH", body: "Together decide which recipe to make, considering ingredients and time." },
      { title: "Prepare the recipe", stepFor: "BOTH", body: "Follow the steps, dividing tasks and helping each other as you cook." },
      { title: "Taste and talk", stepFor: "BOTH", body: "Enjoy the dish, discuss what you enjoyed, and note any changes you'd make next time." }
    ]
  },
  {
    slug: "first-jobs",
    title: "First Jobs",
    summary: "Talk about your first work experiences, what you learned, and how they shaped you.",
    description: "Older adult recalls their first job—what they did, how much they earned, and what they learned. Younger adult shares their first job or a chores‑for‑pay experience. You compare responsibilities, challenges, and the pride of earning your own money.",
    category: "family-history",
    collection: "sounds-of-our-lives",
    estimatedMinutes: 30,
    difficulty: "MEDIUM",
    reflectionQuestion: "How did your first job influence your attitude toward work and money?",
    isPremium: true,
    steps: [
      { title: "Older adult describes first job", stepFor: "OLDER", body: "Share what your first job was, your duties, pay, and what you learned from it." },
      { title: "Younger adult describes first job", stepFor: "YOUNGER", body: "Share what your first job or paid chore was, your duties, pay, and what you learned." },
      { title: "Compare experiences", stepFor: "BOTH", body: "List similarities and differences between the two jobs or chores." },
      { title: "Discuss surprises", stepFor: "BOTH", body: "Talk about what surprised you about the other's work experience." },
      { title: "Advice to younger self", stepFor: "BOTH", body: "Each give one piece of advice you’d give to your younger self about starting work." }
    ]
  },
  {
    slug: "letters-to-the-future",
    title: "Letters to the Future",
    summary: "Write a letter together to be opened years from now, sharing hopes and advice.",
    description: "Each person writes a short letter to a future family member—maybe a grandchild or great‑grandchild—describing life today, values, and wishes. You exchange letters, read them aloud, and combine ideas into one joint letter to seal and store.",
    category: "storytelling",
    estimatedMinutes: 35,
    difficulty: "INVOLVED",
    reflectionQuestion: "What message do you most want future generations to know about your life today?",
    isPremium: true,
    steps: [
      { title: "Older adult writes letter", stepFor: "OLDER", body: "Write a short letter (3‑4 sentences) to a future descendant, describing daily life and hopes." },
      { title: "Younger adult writes letter", stepFor: "YOUNGER", body: "Write a short letter (3‑4 sentences) to a future descendant, describing your world and wishes." },
      { title: "Read letters aloud", stepFor: "BOTH", body: "Read each other's letters and note any common themes or wishes." },
      { title: "Create joint letter", stepFor: "BOTH", body: "Draft a single joint letter, merging the best parts of each letter." },
      { title: "Seal and store", stepFor: "BOTH", body: "Fold the joint letter, place it in an envelope, and decide where to keep it until the future." }
    ]
  },
  {
    slug: "map-of-my-life",
    title: "Map of My Life",
    summary: "Draw a simple map marking places that matter to each of you and share the stories behind them.",
    description: "Each person marks on a paper map (or printout) the towns, schools, homes, or vacation spots that have shaped their life. You take turns pointing to each place and telling a brief story about what happened there and why it’s important. The map becomes a visual conversation about geography and memory.",
    category: "family-history",
    collection: "roots-and-branches",
    estimatedMinutes: 40,
    difficulty: "INVOLVED",
    reflectionQuestion: "Which place on the map surprised you to learn was important to the other person, and why?",
    isPremium: true,
    steps: [
      { title: "Older adult marks places", stepFor: "OLDER", body: "Mark three places on the map that are meaningful to you and label each clearly." },
      { title: "Younger adult marks places", stepFor: "YOUNGER", body: "Mark three places on the map that are meaningful to you and label each clearly." },
      { title: "Older adult shares stories", stepFor: "OLDER", body: "For each of your marked places, tell a short story about what happened there and why it matters." },
      { title: "Younger adult shares stories", stepFor: "YOUNGER", body: "For each of your marked places, tell a short story about what happened there and why it matters." },
      { title: "Discuss connections", stepFor: "BOTH", body: "Talk about any overlapping places and what you learned about each other's ties to geography." }
    ]
  },
  {
    slug: "tech-tour",
    title: "Tech Tour",
    summary: "Younger adult shows the older adult a favorite app, device, or online tool and explains how to use it safely.",
    description: "Younger adult picks a technology they use daily—such as a messaging app, video chat, or a hobby website—and walks the older adult through opening it, navigating basic features, and setting privacy controls. Older adult asks questions and tries a simple task. Roles can reverse if the older adult wants to show something they know.",
    category: "skills-swap",
    estimatedMinutes: 30,
    difficulty: "INVOLVED",
    reflectionQuestion: "What did you find most helpful or surprising about learning the new technology together?",
    steps: [
      { title: "Younger adult selects tech", stepFor: "YOUNGER", body: "Choose the app, device, or tool you want to demonstrate and name it." },
      { title: "Younger adult shows basics", stepFor: "YOUNGER", body: "Show how to open the app, log in if needed, and point out the main screen." },
      { title: "Older adult asks questions", stepFor: "OLDER", body: "Ask two questions about privacy, safety, or how something works while the younger adult answers." },
      { title: "Complete a task together", stepFor: "BOTH", body: "Work together to do a simple task, like sending a message or making a call." },
      { title: "Reflect on the experience", stepFor: "BOTH", body: "Discuss what you liked about learning together and what you’d like to explore next." }
    ]
  },
  {
    slug: "family-sayings",
    title: "Family Sayings",
    summary: "Share and explain the sayings, proverbs, or jokes that run in your family.",
    description: "Each person recalls a saying they’ve heard from parents, grandparents, or relatives—maybe a piece of advice, a joke, or a proverb. They say it aloud, explain its meaning and origin, and discuss whether it still feels true today. You end with a favorite new saying you create together.",
    category: "storytelling",
    collection: "kitchen-table-stories",
    estimatedMinutes: 20,
    difficulty: "INVOLVED",
    reflectionQuestion: "Which family saying resonated most with you today, what does it reveal about your family's values?",
    steps: [
      { title: "Older adult says a saying", stepFor: "OLDER", body: "State a family saying you know clearly and exactly as you heard it." },
      { title: "Younger adult says a saying", stepFor: "YOUNGER", body: "State a family saying you know clearly and exactly as you heard it." },
      { title: "Older adult explains meaning", stepFor: "OLDER", body: "Explain what the saying means and where you first heard it or who said it." },
      { title: "Younger adult explains meaning", stepFor: "YOUNGER", body: "Explain what your saying means and where you first heard it or who said it." },
      { title: "Discuss and create new", stepFor: "BOTH", body: "Talk about how the sayings apply today and together invent a new family saying." }
    ]
  }
];