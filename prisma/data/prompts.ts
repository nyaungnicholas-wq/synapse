// Starter conversation prompts. Audience: who mainly answers (OLDER = asks about decades ago).
export type SeedCategory = { slug: string; name: string; description: string };
export type SeedPrompt = {
  category: string;
  text: string;
  followUp?: string;
  audience: "ANYONE" | "OLDER" | "YOUNGER";
  isPremium?: boolean;
  featured?: boolean;
};

export const promptCategories: SeedCategory[] = [
  { slug: "childhood", name: "Childhood", description: "Where you grew up, who was around, and what a normal day looked like." },
  { slug: "family", name: "Family", description: "The people who made you, raised you and drove you up the wall." },
  { slug: "life-lessons", name: "Life lessons", description: "Things you learned the hard way, so the other person doesn't have to." },
  { slug: "dreams", name: "Dreams", description: "What you hoped for, what changed, and what you still want." },
  { slug: "funny-stories", name: "Funny stories", description: "Mishaps, embarrassments and the stories that still make you laugh." },
  { slug: "traditions", name: "Traditions", description: "Holidays, habits and the small rituals that make a family feel like one." },
  { slug: "music", name: "Music", description: "Songs, singers and the soundtrack of each of your lives." },
  { slug: "food", name: "Food", description: "Recipes, kitchens and the meals you'd cross town for." },
  { slug: "school", name: "School", description: "Teachers, classmates and what learning looked like then and now." },
  { slug: "technology", name: "Technology", description: "The gadgets and inventions that changed how each of you lives." },
  { slug: "relationships", name: "Relationships", description: "Friendship, love and how people find each other." },
  { slug: "future", name: "The future", description: "Hopes for the years ahead and what you'd like to pass on." },
];

export const prompts: SeedPrompt[] = [
  // childhood
  { category: "childhood", text: "Which smell takes you straight back to the house you grew up in?", followUp: "Who was usually in the room when you smelled it?", audience: "ANYONE", featured: true },
  { category: "childhood", text: "Where did you go when you wanted to be alone as a kid?", audience: "ANYONE" },
  { category: "childhood", text: "How did you get to school, and what did you see on the way?", followUp: "Did you ever take a shortcut you weren't supposed to?", audience: "OLDER" },
  { category: "childhood", text: "Which toy or game did you play with until it fell apart?", audience: "ANYONE" },
  { category: "childhood", text: "How much did a sweet or a comic cost when you were ten, and how did you get the money?", audience: "OLDER", isPremium: true },
  { category: "childhood", text: "Which rule at home felt unfair back then but makes sense to you now?", audience: "YOUNGER" },

  // family
  { category: "family", text: "Who in our family do people say you take after, and do you agree?", followUp: "Which habit of theirs do you notice in yourself?", audience: "ANYONE" },
  { category: "family", text: "How did your parents meet, as far as you know the story?", audience: "OLDER", featured: true },
  { category: "family", text: "Which relative did you most look forward to seeing, and why?", audience: "ANYONE" },
  { category: "family", text: "Is there a family story that gets told differently depending on who tells it?", followUp: "Which version do you believe?", audience: "OLDER", isPremium: true },
  { category: "family", text: "What do you think our family is especially good at?", audience: "YOUNGER" },
  { category: "family", text: "Was there a phrase your parents said so often that you can still hear it?", audience: "OLDER" },

  // life lessons
  { category: "life-lessons", text: "Who was the first person who trusted you with something important?", followUp: "How did it feel to be trusted like that?", audience: "ANYONE", featured: true },
  { category: "life-lessons", text: "Which mistake taught you more than any success did?", audience: "OLDER" },
  { category: "life-lessons", text: "Did you ever change your mind about something you were completely sure of?", audience: "ANYONE" },
  { category: "life-lessons", text: "Which piece of advice did you ignore and later wish you'd taken?", audience: "OLDER", isPremium: true },
  { category: "life-lessons", text: "Which thing do you think adults worry about too much?", followUp: "And which do they not worry about enough?", audience: "YOUNGER" },
  { category: "life-lessons", text: "How do you know when it's time to stop trying and let something go?", audience: "ANYONE", isPremium: true },

  // dreams
  { category: "dreams", text: "What did you want to be when you grew up, and what changed?", audience: "ANYONE" },
  { category: "dreams", text: "If money didn't matter, how would you spend an ordinary Tuesday?", audience: "ANYONE" },
  { category: "dreams", text: "Was there a place you always wanted to visit but never did?", followUp: "Is it too late? What would it take?", audience: "OLDER" },
  { category: "dreams", text: "Which goal are you working on right now that most people don't know about?", audience: "YOUNGER" },
  { category: "dreams", text: "Did you ever have a dream that came true and turned out different than you imagined?", audience: "OLDER", isPremium: true },

  // funny stories
  { category: "funny-stories", text: "Which moment made you laugh so hard you couldn't breathe?", audience: "ANYONE", featured: true },
  { category: "funny-stories", text: "Did you ever get caught doing something you really weren't supposed to?", followUp: "Who caught you, and what happened next?", audience: "ANYONE" },
  { category: "funny-stories", text: "Which family meal or holiday went completely wrong?", audience: "OLDER" },
  { category: "funny-stories", text: "Which word or saying did you misunderstand for years?", audience: "ANYONE" },
  { category: "funny-stories", text: "Which embarrassing thing would you still rather nobody found out about?", audience: "YOUNGER", isPremium: true },

  // traditions
  { category: "traditions", text: "Which holiday tradition would you hate to see disappear?", followUp: "Who started it, as far as you know?", audience: "ANYONE" },
  { category: "traditions", text: "How did your family celebrate birthdays when you were young?", audience: "OLDER" },
  { category: "traditions", text: "Is there a small ritual you do every week without thinking about it?", audience: "ANYONE" },
  { category: "traditions", text: "Which new tradition would you like the two of us to start?", audience: "YOUNGER" },
  { category: "traditions", text: "Were there superstitions in your house growing up?", audience: "OLDER", isPremium: true },

  // music
  { category: "music", text: "Which song takes you straight back to being seventeen?", followUp: "Where were you the first time you heard it?", audience: "ANYONE" },
  { category: "music", text: "If you could put one song in a time capsule for 2075, which would it be?", audience: "ANYONE", featured: true },
  { category: "music", text: "Who was the singer everyone your age was crazy about?", audience: "OLDER" },
  { category: "music", text: "Which song would you play to explain who you are right now?", audience: "YOUNGER" },
  { category: "music", text: "How did you listen to new music when you were young, and how did you find it?", audience: "OLDER", isPremium: true },
  { category: "music", text: "Did anyone ever dance with you to a song you still remember?", audience: "OLDER" },

  // food
  { category: "food", text: "Which family dish would you most want to learn before it's forgotten?", followUp: "Who makes it best?", audience: "YOUNGER" },
  { category: "food", text: "What did a normal weeknight dinner look like in your house growing up?", audience: "OLDER" },
  { category: "food", text: "Which food did you hate as a child and love now, or the other way round?", audience: "ANYONE" },
  { category: "food", text: "If we opened a small café together, what would be on the menu?", audience: "ANYONE" },
  { category: "food", text: "Was there a food that meant someone was celebrating, or that someone was sad?", audience: "OLDER", isPremium: true },

  // school
  { category: "school", text: "Who was the teacher you still think about?", followUp: "What would you say to them now?", audience: "ANYONE" },
  { category: "school", text: "How strict was school when you were young? Give me an example.", audience: "OLDER" },
  { category: "school", text: "Which subject do you wish school had taught you that it never did?", audience: "ANYONE" },
  { category: "school", text: "Which part of school today would surprise me the most?", audience: "YOUNGER" },
  { category: "school", text: "Who did you sit with at lunch, and what did you talk about?", audience: "ANYONE", isPremium: true },

  // technology
  { category: "technology", text: "Which invention changed your daily life the most, and did you like it at first?", audience: "OLDER" },
  { category: "technology", text: "Which app or gadget could you not live without, and why?", followUp: "Could you show me how you use it?", audience: "YOUNGER" },
  { category: "technology", text: "How did you get in touch with a friend before mobile phones?", audience: "OLDER" },
  { category: "technology", text: "Is there an old way of doing something that was better than the new way?", audience: "ANYONE", isPremium: true },
  { category: "technology", text: "If you could un-invent one thing, which would it be?", audience: "ANYONE" },

  // relationships
  { category: "relationships", text: "How did you know your best friend was going to be your best friend?", audience: "ANYONE" },
  { category: "relationships", text: "How did people go on dates when you were young?", followUp: "Who paid, and where did you go?", audience: "OLDER" },
  { category: "relationships", text: "Which friendship from your life would you like to get back in touch with?", audience: "OLDER", isPremium: true },
  { category: "relationships", text: "What makes someone easy to talk to?", audience: "ANYONE" },
  { category: "relationships", text: "What's the hardest part of making friends at your age?", audience: "YOUNGER" },

  // future
  { category: "future", text: "What do you hope is still true about our family in thirty years?", audience: "ANYONE" },
  { category: "future", text: "Which skill or story of yours would you like me to keep and pass on?", audience: "OLDER" },
  { category: "future", text: "What do you think your life will look like when you're my age?", followUp: "What would you like to be different from mine?", audience: "YOUNGER" },
  { category: "future", text: "What are you looking forward to this year, even if it's small?", audience: "ANYONE" },
  { category: "future", text: "If you could send a letter to yourself ten years from now, what would it say?", audience: "ANYONE", isPremium: true },
];
