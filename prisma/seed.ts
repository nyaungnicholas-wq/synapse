import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/crypto";
import { promptCategories, prompts } from "./data/prompts";
import { activityCategories, collections, activities } from "./data/activities";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DAY = 86400000;
const daysAgo = (n: number, hoursLater = 0) => new Date(Date.now() - n * DAY + hoursLater * 3600000);

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW !== "1") {
    throw new Error("Refusing to seed a production database");
  }

  await db.$executeRawUnsafe(`TRUNCATE TABLE "EmailOutbox","Report","Notification","Subscription","Plan","Memory","Photo","ActivityNote","ActivitySession","PromptFavorite","PromptResponse","Conversation","ActivityStep","Activity","Collection","Prompt","Category","Invitation","ConnectionMember","Connection","AuthToken","Session","Profile","User" CASCADE`);

  // 1. Plans
  await db.plan.create({
    data: {
      code: "FREE",
      name: "Free",
      priceCents: 0,
      interval: "MONTH",
      weeklyPromptLimit: 3,
      weeklyActivityLimit: 1,
      memoryLimit: 30,
      features: ["3 new conversations each week", "1 guided activity each week", "Your private Connection Space", "Up to 30 saved memories"],
    },
  });
  await db.plan.create({
    data: {
      code: "PREMIUM",
      name: "Premium",
      priceCents: 799,
      interval: "MONTH",
      weeklyPromptLimit: null,
      weeklyActivityLimit: null,
      memoryLimit: null,
      features: ["Unlimited conversation questions", "The full activity library", "Monthly premium activity collections", "Unlimited memories and photos", "Covers both people in your space"],
    },
  });

  // 2. Categories
  const promptCategoryMap = new Map<string, string>();
  for (const [i, cat] of promptCategories.entries()) {
    const category = await db.category.create({
      data: {
        kind: "PROMPT",
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    promptCategoryMap.set(cat.slug, category.id);
  }
  const activityCategoryMap = new Map<string, string>();
  for (const [i, cat] of activityCategories.entries()) {
    const category = await db.category.create({
      data: {
        kind: "ACTIVITY",
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    activityCategoryMap.set(cat.slug, category.id);
  }

  // 3. Prompts
  const promptMap = new Map<string, string>();
  for (const p of prompts) {
    const prompt = await db.prompt.create({
      data: {
        categoryId: promptCategoryMap.get(p.category)!,
        text: p.text,
        followUp: p.followUp ?? null,
        audience: p.audience,
        isPremium: p.isPremium ?? false,
        featured: p.featured ?? false,
        status: "PUBLISHED",
      },
    });
    promptMap.set(p.text, prompt.id);
  }

  // 4. Collections
  const collectionMap = new Map<string, string>();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (const c of collections) {
    const month = new Date(Date.UTC(y, m + c.monthOffset, 1));
    const collection = await db.collection.create({
      data: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        month,
        isPremium: c.isPremium,
        status: "PUBLISHED",
      },
    });
    collectionMap.set(c.slug, collection.id);
  }

  // 5. Activities
  const activityMap = new Map<string, string>();
  for (const a of activities) {
    const activity = await db.activity.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        description: a.description,
        categoryId: activityCategoryMap.get(a.category)!,
        collectionId: a.collection ? collectionMap.get(a.collection)! : null,
        estimatedMinutes: a.estimatedMinutes,
        difficulty: a.difficulty,
        reflectionQuestion: a.reflectionQuestion,
        isPremium: a.isPremium ?? false,
        featured: a.featured ?? false,
        status: "PUBLISHED",
        steps: {
          create: a.steps.map((s, i) => ({
            order: i + 1,
            title: s.title,
            body: s.body,
            stepFor: s.stepFor,
          })),
        },
      },
    });
    activityMap.set(a.slug, activity.id);
  }

  // 6. Users
  const passwordHash = await hashPassword("synapse-demo-2026");
  await db.user.create({
    data: {
      email: "admin@synapse.test",
      passwordHash,
      role: "ADMIN",
      profile: {
        create: {
          firstName: "Avery",
          ageRange: "AGE_30_49",
          relationshipType: "OTHER",
          side: "YOUNGER",
          connectWithLabel: "families in our pilot",
          interests: ["Technology"],
          goals: ["UNDERSTAND_EACH_OTHER"],
          onboardedAt: new Date(),
        },
      },
      emailVerifiedAt: new Date(),
    },
  });
  const rose = await db.user.create({
    data: {
      email: "rose@synapse.test",
      passwordHash,
      createdAt: daysAgo(75),
      profile: {
        create: {
          firstName: "Rose",
          ageRange: "AGE_65_79",
          relationshipType: "GRANDPARENT_GRANDCHILD",
          side: "OLDER",
          connectWithLabel: "my grandson Leo",
          interests: ["Music", "Gardening", "Cooking", "Family history"],
          goals: ["PRESERVE_STORIES", "TALK_MORE_OFTEN"],
          textSize: "LARGE",
          onboardedAt: daysAgo(75),
        },
      },
      emailVerifiedAt: daysAgo(74),
    },
  });
  const leo = await db.user.create({
    data: {
      email: "leo@synapse.test",
      passwordHash,
      createdAt: daysAgo(70),
      profile: {
        create: {
          firstName: "Leo",
          ageRange: "UNDER_18",
          relationshipType: "GRANDPARENT_GRANDCHILD",
          side: "YOUNGER",
          connectWithLabel: "my grandma Rose",
          interests: ["Music", "Games", "Technology", "Sports"],
          goals: ["LEARN_ABOUT_LIVES", "MEANINGFUL_TIME"],
          onboardedAt: daysAgo(70),
        },
      },
      emailVerifiedAt: daysAgo(69),
    },
  });
  const sam = await db.user.create({
    data: {
      email: "sam@synapse.test",
      passwordHash,
      createdAt: daysAgo(2),
      profile: {
        create: {
          firstName: "Sam",
          ageRange: "AGE_80_PLUS",
          relationshipType: "MENTOR_MENTEE",
          side: "OLDER",
          connectWithLabel: "a student from the library program",
          interests: ["Books", "History"],
          goals: ["UNDERSTAND_EACH_OTHER"],
          onboardedAt: daysAgo(2),
        },
      },
      emailVerifiedAt: daysAgo(1),
    },
  });

  // 7. Connection Rose & Leo
  const connectionRoseLeo = await db.connection.create({
    data: {
      createdAt: daysAgo(70),
      members: {
        create: [
          { userId: rose.id, side: "OLDER", joinedAt: daysAgo(70) },
          { userId: leo.id, side: "YOUNGER", joinedAt: daysAgo(69) },
        ],
      },
    },
  });
  await db.invitation.create({
    data: {
      connectionId: connectionRoseLeo.id,
      inviterId: rose.id,
      code: "WREN-4E2X",
      status: "ACCEPTED",
      expiresAt: daysAgo(62),
      acceptedAt: daysAgo(69),
      acceptedById: leo.id,
      createdAt: daysAgo(70),
    },
  });

  // 8. Sam's waiting space
  const connectionSam = await db.connection.create({
    data: {
      members: {
        create: [{ userId: sam.id, side: "OLDER", joinedAt: daysAgo(1) }],
      },
    },
  });
  await db.invitation.create({
    data: {
      connectionId: connectionSam.id,
      inviterId: sam.id,
      code: "GRAN-7K3P",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 6 * DAY),
      createdAt: daysAgo(1),
    },
  });

  // 9. Demo conversations in Rose & Leo's space
  const extraPrompts = [
    { category: "music", text: "Which song takes you straight back to being seventeen?" },
    { category: "childhood", text: "What did a perfect Saturday look like when you were ten?" },
    { category: "technology", text: "Which invention changed your everyday life the most?" },
    { category: "food", text: "Which family dish should we learn to cook before it's forgotten?" },
    { category: "school", text: "Who was the teacher you still think about?" },
    { category: "dreams", text: "What did you want to be when you grew up, and what changed?" },
  ];
  const extraPromptMap = new Map<string, string>();
  for (const p of extraPrompts) {
    const prompt = await db.prompt.create({
      data: {
        categoryId: promptCategoryMap.get(p.category)!,
        text: p.text,
        status: "PUBLISHED",
      },
    });
    extraPromptMap.set(p.text, prompt.id);
  }

  const conversationsData = [
    {
      promptText: extraPrompts[0].text,
      startedById: rose.id,
      status: "COMPLETED",
      createdAt: daysAgo(60),
      completedAt: daysAgo(58),
      responses: [
        { authorId: rose.id, body: "Oh, that would be 'Blue Moon' by The Marcels. I heard it at the school dance in 1961 and slow-danced with Billy Jenkins behind the gym.", createdAt: daysAgo(60) },
        { authorId: leo.id, body: "nice! i love doo-wop. my fave is 'earth angel' by the penguins - it's in that one scene in back to the future", createdAt: daysAgo(60, 4) },
        { authorId: rose.id, body: "You know it! We used to play it at the roller rink every Friday night.", createdAt: daysAgo(60, 8) },
      ],
    },
    {
      promptText: extraPrompts[1].text,
      startedById: leo.id,
      status: "COMPLETED",
      createdAt: daysAgo(46),
      completedAt: daysAgo(44),
      responses: [
        { authorId: leo.id, body: "perfect saturday was waking up early to cartoons, then riding my bike to the creek to catch frogs with my dad.", createdAt: daysAgo(46) },
        { authorId: rose.id, body: "Mine was helping Mama in the garden, then walking to the corner store for a nickel Coke and sitting on the porch swing listening to the radio.", createdAt: daysAgo(46, 3) },
        { authorId: leo.id, body: "that sounds so peaceful. i wish i had more chill saturdays like that instead of homework and practice", createdAt: daysAgo(46, 6) },
      ],
    },
    {
      promptText: extraPrompts[2].text,
      startedById: rose.id,
      status: "COMPLETED",
      createdAt: daysAgo(32),
      completedAt: daysAgo(30),
      responses: [
        { authorId: rose.id, body: "The washing machine. No more boiling water and scrubbing clothes on a rub board. It gave me back so many hours.", createdAt: daysAgo(32) },
        { authorId: leo.id, body: "yeah that's huge. i can't imagine doing laundry by hand. we take it for granted", createdAt: daysAgo(32, 4) },
        { authorId: rose.id, body: "Exactly. And the dryer meant no more hanging clothes in the freezing winter!", createdAt: daysAgo(32, 8) },
      ],
    },
    {
      promptText: extraPrompts[3].text,
      startedById: leo.id,
      status: "COMPLETED",
      createdAt: daysAgo(18),
      completedAt: daysAgo(16),
      responses: [
        { authorId: leo.id, body: "my grandma's peach cobbler. she uses fresh peaches from the farmer's market and a lattice top.", createdAt: daysAgo(18) },
        { authorId: rose.id, body: "That sounds divine! My mama's chicken and dumplings was the Sunday supper that brought everyone to the table.", createdAt: daysAgo(18, 3) },
        { authorId: leo.id, body: "i'd love to learn that! maybe we can make it together sometime?", createdAt: daysAgo(18, 6) },
      ],
    },
    {
      promptText: extraPrompts[4].text,
      startedById: rose.id,
      status: "COMPLETED",
      createdAt: daysAgo(11),
      completedAt: daysAgo(9),
      responses: [
        { authorId: rose.id, body: "Miss Thompson, my third-grade teacher. She let me read ahead and brought in her record player for Friday afternoon music time.", createdAt: daysAgo(11) },
        { authorId: leo.id, body: "that's cool. my fave was mr. patel in 7th grade science - he made us build egg drop contraptions", createdAt: daysAgo(11, 3) },
        { authorId: rose.id, body: "I still remember her saying, 'A reader lives a thousand lives before he dies.'", createdAt: daysAgo(11, 6) },
      ],
    },
    {
      promptText: extraPrompts[5].text,
      startedById: rose.id,
      status: "IN_PROGRESS",
      createdAt: daysAgo(9),
      responses: [
        { authorId: rose.id, body: "I wanted to be a nurse like Florence Nightingale. I ended up teaching home ec instead when the hospital job didn't work out.", createdAt: daysAgo(9) },
      ],
    },
  ];

  const conversationMap = new Map<string, string>();
  for (const convData of conversationsData) {
    const promptId = extraPromptMap.get(convData.promptText)!;
    const conversation = await db.conversation.create({
      data: {
        connectionId: connectionRoseLeo.id,
        promptId,
        startedById: convData.startedById,
        status: convData.status as "IN_PROGRESS" | "COMPLETED",
        completedAt: convData.completedAt,
        createdAt: convData.createdAt,
      },
    });
    conversationMap.set(convData.promptText, conversation.id);
    for (const [i, resp] of convData.responses.entries()) {
      await db.promptResponse.create({
        data: {
          conversationId: conversation.id,
          authorId: resp.authorId,
          body: resp.body,
          createdAt: new Date(convData.createdAt.getTime() + (i + 1) * 3600000), // spaced a few hours apart
        },
      });
    }
  }

  // 10. Activity sessions in the space
  const thenVsNowActivityId = activityMap.get("then-vs-now")!;
  const memoryLaneActivityId = activityMap.get("memory-lane")!;
  const recipeSwapActivityId = activityMap.get("recipe-swap")!;

  const thenVsNowSession = await db.activitySession.create({
    data: {
      connectionId: connectionRoseLeo.id,
      activityId: thenVsNowActivityId,
      startedById: rose.id,
      status: "COMPLETED",
      currentStep: 6, // steps + 1
      completedAt: daysAgo(52),
      createdAt: daysAgo(52),
    },
  });
  await db.activityNote.createMany({
    data: [
      { sessionId: thenVsNowSession.id, authorId: rose.id, stepOrder: 1, body: "Back in 1952, I walked to school through the oak trees. No buses, just us kids and our lunch pails." },
      { sessionId: thenVsNowSession.id, authorId: leo.id, stepOrder: 1, body: "I take the bus now, but I wish I could walk. It's only two miles but Mom worries about traffic." },
      { sessionId: thenVsNowSession.id, authorId: rose.id, stepOrder: 2, body: "We had chalk and jump ropes at recess. No screens, just imagination." },
      { sessionId: thenVsNowSession.id, authorId: leo.id, stepOrder: 2, body: "Recess is on the phone now - we play Among Us or watch TikTok together." },
      { sessionId: thenVsNowSession.id, authorId: rose.id, stepOrder: null, body: "I'm glad you have safe ways to connect, even if it's different from my time." },
    ],
  });

  const memoryLaneSession = await db.activitySession.create({
    data: {
      connectionId: connectionRoseLeo.id,
      activityId: memoryLaneActivityId,
      startedById: rose.id,
      status: "COMPLETED",
      completedAt: daysAgo(25),
      createdAt: daysAgo(25),
    },
  });
  await db.activityNote.createMany({
    data: [
      { sessionId: memoryLaneSession.id, authorId: rose.id, stepOrder: 1, body: "This is my first paycheck from the diner in 1958. I was sixteen and felt rich making $0.75 an hour." },
      { sessionId: memoryLaneSession.id, authorId: rose.id, stepOrder: 2, body: "I saved every penny to buy my mother a new apron for Mother's Day." },
      { sessionId: memoryLaneSession.id, authorId: leo.id, stepOrder: 3, body: "What did you buy with your first paycheck, Rose?" },
      { sessionId: memoryLaneSession.id, authorId: leo.id, stepOrder: 4, body: "Did you ever feel nervous handling money at that age?" },
      { sessionId: memoryLaneSession.id, authorId: leo.id, stepOrder: null, body: "It's amazing how proud you were to help your family. Makes me want to save for something special too." },
    ],
  });

  const recipeSwapSession = await db.activitySession.create({
    data: {
      connectionId: connectionRoseLeo.id,
      activityId: recipeSwapActivityId,
      startedById: rose.id,
      status: "IN_PROGRESS",
      currentStep: 2,
      createdAt: daysAgo(8),
    },
  });
  await db.activityNote.create({
    data: {
      sessionId: recipeSwapSession.id,
      authorId: rose.id,
      stepOrder: 1,
      body: "My mama's peach cobbler recipe: 6 cups sliced peaches, 1 cup sugar, 1 tsp cinnamon, topped with biscuit dough. Bake at 375 for 40 minutes.",
    },
  });

  // 11. Memories (connectionId of Rose & Leo)
  const convARoseLeoId = conversationMap.get(extraPrompts[0].text)!;
  const convDRoseLeoId = conversationMap.get(extraPrompts[3].text)!;
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: rose.id,
      type: "CONVERSATION",
      title: extraPrompts[0].text,
      body: `Rose: Oh, that would be 'Blue Moon' by The Marcels. I heard it at the school dance in 1961 and slow-danced with Billy Jenkins behind the gym.\n\nLeo: nice! i love doo-wop. my fave is 'earth angel' by the penguins - it's in that one scene in back to the future\n\nRose: You know it! We used to play it at the roller rink every Friday night.`,
      categoryId: promptCategoryMap.get("music")!,
      conversationId: convARoseLeoId,
      favorite: true,
      createdAt: daysAgo(58),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: leo.id,
      type: "CONVERSATION",
      title: extraPrompts[3].text,
      body: `Leo: my grandma's peach cobbler. she uses fresh peaches from the farmer's market and a lattice top.\n\nRose: That sounds divine! My mama's chicken and dumplings was the Sunday supper that brought everyone to the table.\n\nLeo: i'd love to learn that! maybe we can make it together sometime?`,
      categoryId: promptCategoryMap.get("food")!,
      conversationId: convDRoseLeoId,
      createdAt: daysAgo(16),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: rose.id,
      type: "ACTIVITY",
      title: "Then vs. Now",
      body: `Older adult shares a youth memory — Back in 1952, I walked to school through the oak trees. No buses, just us kids and our lunch pails.\nYounger adult shares today's routine — I take the bus now, but I wish I could walk. It's only two miles but Mom worries about traffic.\nFind similarities — We had chalk and jump ropes at recess. No screens, just imagination.\nNote differences — Recess is on the phone now - we play Among Us or watch TikTok together.\nExchange era wishes — I'm glad you have safe ways to connect, even if it's different from my time.`,
      activityId: thenVsNowActivityId,
      activitySessionId: thenVsNowSession.id,
      categoryId: activityCategoryMap.get("storytelling")!,
      createdAt: daysAgo(52),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: leo.id,
      type: "ACTIVITY",
      title: "Memory Lane",
      body: `Older adult picks a memory — This is my first paycheck from the diner in 1958. I was sixteen and felt rich making $0.75 an hour.\nOlder adult adds details — I saved every penny to buy my mother a new apron for Mother's Day.\nYounger adult asks follow‑up — What did you buy with your first paycheck, Rose?\nYounger adult asks deeper — Did you ever feel nervous handling money at that age?\nReflect on the story — It's amazing how proud you were to help your family. Makes me want to save for something special too.`,
      activityId: memoryLaneActivityId,
      activitySessionId: memoryLaneSession.id,
      categoryId: activityCategoryMap.get("storytelling")!,
      createdAt: daysAgo(25),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: rose.id,
      type: "STORY",
      title: "The summer we drove to the coast",
      body: "We packed the old station wagon with blankets and a cooler of lemonade. Daddy hummed along to the radio as we drove through the pine forests. The ocean smelled like salt and freedom when we finally saw it. We spent the day building sandcastles and chasing waves until sunset.",
      whenText: "Summer 1968",
      favorite: true,
      createdAt: daysAgo(40),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: rose.id,
      type: "STORY",
      title: "How your great-grandpa proposed",
      body: "He waited until the last song at the Saturday night dance. Then he knelt right there on the sawdust floor and asked me to be his wife. Everyone clapped and the band played 'Sweet Georgia Brown' as we walked off together.",
      whenText: "Spring 1951",
      createdAt: daysAgo(20),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: leo.id,
      type: "MOMENT",
      title: "Grandma beat me at Uno four times in a row",
      body: "She's got a killer poker face. I kept shouting 'UNO!' too early and had to draw twice. By the fourth game I was laughing too hard to be mad.",
      whenText: "Last Thanksgiving",
      createdAt: daysAgo(14),
    },
  });
  await db.memory.create({
    data: {
      connectionId: connectionRoseLeo.id,
      createdById: leo.id,
      type: "STORY",
      title: "My first day at the new school",
      body: "I got lost trying to find homeroom and ended up in the choir room by mistake. Mr. Lopez redirected me with a smile and said it happens to everyone. By lunch I had made two friends who showed me where to sit.",
      whenText: "September",
      createdAt: daysAgo(10),
    },
  });

  // 12. Favorites: Leo favorites 2 of the seeded prompts from `prompts`
  const musicPrompt = prompts.find(p => p.category === "music")!;
  const futurePrompt = prompts.find(p => p.category === "future")!;
  await db.promptFavorite.create({
    data: {
      userId: leo.id,
      promptId: promptMap.get(musicPrompt.text)!,
    },
  });
  await db.promptFavorite.create({
    data: {
      userId: leo.id,
      promptId: promptMap.get(futurePrompt.text)!,
    },
  });

  // 13. Notifications
  const conversationFId = conversationMap.get(extraPrompts[5].text)!;
  await db.notification.create({
    data: {
      userId: leo.id,
      type: "NEW_RESPONSE",
      title: "Rose answered a question",
      link: `/spaces/${connectionRoseLeo.id}/talk/${conversationFId}`,
      readAt: null,
      createdAt: daysAgo(9),
    },
  });
  const leoSchoolMemoryId = (await db.memory.findFirst({
    where: { title: "My first day at the new school", connectionId: connectionRoseLeo.id },
  }))!.id;
  await db.notification.create({
    data: {
      userId: rose.id,
      type: "MEMORY_ADDED",
      title: "Leo added \"My first day at the new school\" to your memories",
      link: `/spaces/${connectionRoseLeo.id}/memories/${leoSchoolMemoryId}`,
      readAt: daysAgo(9),
      createdAt: daysAgo(10),
    },
  });

  // 14. Report
  await db.report.create({
    data: {
      reporterId: leo.id,
      reason: "other",
      details: "Testing the report button for the pilot — please ignore.",
      status: "CLOSED",
      adminNote: "Confirmed test, closing.",
      createdAt: daysAgo(30),
    },
  });

  // 15. Final log
  console.log(`SEED OK users=4 prompts=${await db.prompt.count()} activities=${await db.activity.count()} memories=${await db.memory.count()}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });