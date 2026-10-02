// Plain-language labels for enum values. Safe to import from client components.
export const AGE_RANGE_LABELS = {
  UNDER_18: "Under 18",
  AGE_18_29: "18–29",
  AGE_30_49: "30–49",
  AGE_50_64: "50–64",
  AGE_65_79: "65–79",
  AGE_80_PLUS: "80 or older",
} as const;

export const RELATIONSHIP_LABELS = {
  GRANDPARENT_GRANDCHILD: "Grandparent and grandchild",
  PARENT_CHILD: "Parent and child",
  AUNT_UNCLE_NIECE_NEPHEW: "Aunt or uncle and niece or nephew",
  MENTOR_MENTEE: "Mentor and mentee",
  CAREGIVER: "Caregiver and the person they support",
  FRIENDS: "Friends from different generations",
  OTHER: "Something else",
} as const;

export const SIDE_LABELS = { OLDER: "The older one", YOUNGER: "The younger one" } as const;

export const GOAL_LABELS = {
  TALK_MORE_OFTEN: "Talk more often",
  LEARN_ABOUT_LIVES: "Learn about each other's lives",
  PRESERVE_STORIES: "Preserve family stories",
  UNDERSTAND_EACH_OTHER: "Understand each other better",
  MEANINGFUL_TIME: "Spend more meaningful time together",
} as const;

export const DIFFICULTY_LABELS = { EASY: "Easy", MEDIUM: "Some effort", INVOLVED: "A bigger project" } as const;

export const MEMORY_TYPE_LABELS = {
  STORY: "Story",
  CONVERSATION: "Conversation",
  ACTIVITY: "Activity",
  PHOTO: "Photo",
  MOMENT: "Favorite moment",
} as const;

export const TEXT_SIZE_LABELS = { STANDARD: "Standard", LARGE: "Large", EXTRA_LARGE: "Extra large" } as const;

/** "3 March 2026" — unambiguous across countries. */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
