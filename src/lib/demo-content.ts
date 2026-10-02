export type Who = "R" | "L";

export const DEMO_CONVERSATIONS: { text: string; category: string; days: number; done: boolean; lines: [Who, string][] }[] = [
  {
    text: "Which song takes you straight back to being seventeen?",
    category: "music",
    days: 60,
    done: true,
    lines: [
      ["R", "In 1963 I heard \"Be My Baby\" on the radio at Woolworth's lunch counter in Millbrook, and I still smell the cherry Coke."],
      ["L", "that's wild. for me it's \"mr. brightside\", heard it at a middle school dance in 2019 and haven't stopped hearing it since"],
      ["R", "Funny how a three-minute song can hold a whole summer. The Ronettes played our senior prom too."]
    ]
  },
  {
    text: "What did a perfect Saturday look like when you were ten?",
    category: "childhood",
    days: 46,
    done: true,
    lines: [
      ["R", "Summer 1955: bike to the creek with my brother, catch crawdads, then Mom's fried chicken on the porch at noon."],
      ["L", "sounds perfect. mine was sleeping till noon, xbox till mom made me walk the dog, then pizza rolls"],
      ["R", "Different decades, same freedom. Nobody tracked us by phone — we just had to be home for supper."]
    ]
  },
  {
    text: "Which invention changed your daily life the most, and did you like it at first?",
    category: "technology",
    days: 32,
    done: true,
    lines: [
      ["R", "The electric washing machine in 1961. I wept when the wringer mangled my favorite dress, but I never hand-washed sheets again."],
      ["L", "smartphone. hated the keyboard at first, now i can't imagine not having maps in my pocket"],
      ["R", "We both resisted the thing that became indispensable. Your thumbs move faster than my wringer ever did."]
    ]
  },
  {
    text: "Which family dish would you most want to learn before it is forgotten?",
    category: "food",
    days: 18,
    done: true,
    lines: [
      ["R", "Great-Aunt Mabel's peach cobbler — baked in a cast-iron skillet with lard crust, served at every reunion since 1948."],
      ["L", "i've had that cobbler. it's the only dessert i'd choose over brownies. teach me?"],
      ["R", "Next time you visit we'll peel peaches together. The secret is under-ripe fruit and a pinch of nutmeg."]
    ]
  },
  {
    text: "Who was the teacher you still think about?",
    category: "school",
    days: 11,
    done: true,
    lines: [
      ["R", "Miss Eleanor Vance, 1958. She let me stay after school to practice Chopin on the auditorium Steinway when my parents couldn't afford lessons."],
      ["L", "mr. torres, 7th grade history. he noticed i only read graphic novels and slipped me \"maus\". changed how i see everything"],
      ["R", "Teachers who see you before you see yourself. Miss Vance wrote \"pianist\" in my yearbook beside my name."]
    ]
  },
  {
    text: "What did you want to be when you grew up, and what changed?",
    category: "dreams",
    days: 9,
    done: false,
    lines: [
      ["R", "I wanted to play Carnegie Hall. Marriage at nineteen and three babies by twenty-three rewrote the score, but I taught piano in this living room for thirty years — that became my stage."]
    ]
  }
];

export const DEMO_STORIES: { by: Who; type: "STORY" | "MOMENT"; title: string; when: string; body: string; days: number; favorite?: boolean }[] = [
  {
    by: "R",
    type: "STORY",
    title: "The summer we drove to the coast",
    when: "Summer 1972",
    body: "Your grandfather borrowed Mr. Henderson's station wagon and packed all five of us plus a cooler of deviled eggs. We sang \"California Dreamin'\" off-key until the tape ate itself. The Pacific was colder than the creek at home, but we stayed until the tide took our sandcastles. I still have the shell necklace I made that night.",
    days: 40,
    favorite: true
  },
  {
    by: "R",
    type: "STORY",
    title: "How your great-grandpa proposed",
    when: "Spring 1951",
    body: "My father hid the ring inside a hollowed-out library book — \"Pride and Prejudice,\" because Mother had read it six times. She found it when she dropped the book on her foot at the kitchen table. He said, \"Figured you'd fall for me eventually.\" They laughed until the biscuits burned, and she told that story every anniversary.",
    days: 20
  },
  {
    by: "L",
    type: "MOMENT",
    title: "Grandma beat me at Uno four times in a row",
    when: "Last Thanksgiving",
    body: "She played a Draw Four on her last card each time and smiled like she'd invented the game. I'm convinced she counts cards.",
    days: 14
  },
  {
    by: "L",
    type: "STORY",
    title: "My first day at the new school",
    when: "September",
    body: "I sat alone at lunch until a kid named Marcus asked if I played 2k. We've been teammates ever since. Turns out the new kid thing isn't so bad when someone passes you the ball.",
    days: 10
  }
];

export const DEMO_THEN_VS_NOW_NOTES: { by: Who; step: number | null; body: string }[] = [
  { by: "R", step: 1, body: "One-room schoolhouse until eighth grade, coal stove in the corner, we walked two miles in snow. Miss Vance taught all eight grades herself." },
  { by: "L", step: 1, body: "Three-story building, chromebooks issued day one, security gates, seven periods, lunch in shifts. I've never seen a chalkboard used for real." },
  { by: "L", step: null, body: "Same nerves on the first day, just different walls." }
];

export const DEMO_RECIPE_NOTE: string = "Great-Aunt Mabel's peach cobbler — use slightly under-ripe peaches so they hold shape, and never skip the nutmeg in the crust.";