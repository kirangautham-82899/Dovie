// Content for the public keyword pages (/habit-tracker, /expense-tracker...).
// Each page targets one search intent with its own title, description, H1,
// body copy and FAQ. FAQ answers are mirrored in FAQPage structured data, so
// they must match the visible text and describe only what Dovie really does.

export const GUIDE_SLUGS = ["habit-tracker", "expense-tracker", "daily-planner", "mood-tracker", "private-journal"] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type Guide = {
  slug: GuideSlug;
  /** Short name used in navigation and related links. */
  name: string;
  /** <title>, about 60 characters, main keyword first. */
  title: string;
  /** Meta description, about 150 characters. */
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  /** The italic, rose-coloured end of the H1. */
  accent: string;
  intro: string;
  tint: string;
  /** Quick reasons, shown as a checklist under the hero. */
  highlights: string[];
  sections: { heading: string; body: string[] }[];
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  featureList: string[];
};

export const GUIDES: Record<GuideSlug, Guide> = {
  "habit-tracker": {
    slug: "habit-tracker",
    name: "Habit tracker",
    title: "Free Habit Tracker App with Streaks & Goals | Dovie",
    description:
      "Dovie is a free habit tracker app with one-tap check-offs, streaks and best runs, goal tracking and a weekly review. Works on Android, iPhone and the web.",
    keywords: [
      "habit tracker",
      "habit tracker app",
      "free habit tracker",
      "habit tracker app free",
      "daily habit tracker",
      "streak tracker",
      "habit tracker India",
      "habit building app",
    ],
    eyebrow: "Free habit tracker app",
    h1: "A habit tracker that's",
    accent: "kind to you.",
    intro:
      "Build small daily habits with one-tap check-offs, streaks and a best run that's always kept. A weekly review shows your rhythm without keeping score, so a missed day is a pause, not a verdict.",
    tint: "bg-lilac",
    highlights: [
      "Tick a habit off in one tap",
      "Your best streak is always kept",
      "Goals for the bigger things",
      "Free, on phone and desktop",
    ],
    sections: [
      {
        heading: "Why most habit trackers stop working",
        body: [
          "Most habit trackers are built around a perfect streak. Miss one day and the counter drops back to zero, which is exactly the moment many people give up. Research on habit formation points the other way: consistency over weeks matters far more than never missing a single day.",
          "Dovie's habit tracker is designed for that reality. Your best streak is always kept, so one missed day never erases what you've built, and the weekly review shows your rhythm across the week instead of a single pass or fail.",
        ],
      },
      {
        heading: "What you can track",
        body: [
          "Anything you want to do regularly: drinking water, reading ten pages, a short walk, stretching, meditation, practising a language, taking medicine on time or going to bed earlier. Start with one or two tiny habits and add more once they feel easy.",
          "Habits sit next to your goals, so the small daily actions connect to the bigger things you're working towards, like running a 5 km or finishing a course.",
        ],
      },
      {
        heading: "One app instead of five",
        body: [
          "Dovie is a habit tracker, daily planner, expense tracker, mood tracker and private journal in one place. Your evening check-in pulls habits, tasks and fitness together into a single daily score, and the weekly review predicts how next week is likely to go from your last four weeks.",
        ],
      },
    ],
    steps: [
      { title: "Add a tiny habit", body: "Pick something small enough to do on a hard day, like two minutes of stretching." },
      { title: "Tick it off", body: "One tap on Goals marks it done. Your streak and best run update on their own." },
      { title: "Look back weekly", body: "The weekly review shows your habit rhythm and what's likely next week." },
    ],
    faq: [
      {
        q: "Is Dovie's habit tracker free?",
        a: "Yes. Dovie is free while in beta, with no limit on the number of habits you track.",
      },
      {
        q: "What happens to my streak if I miss a day?",
        a: "Your current streak starts again, but your best streak is always kept and the weekly review still shows how consistently you showed up. One missed day is a pause, not the end of a habit.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes. Dovie works in any modern browser on Android and iPhone, and you can add it to your home screen to open it like an app.",
      },
      {
        q: "How many habits should I start with?",
        a: "One or two. Small habits that are easy on a bad day stick far better than a long list. Add more once the first ones feel automatic.",
      },
      {
        q: "Can I track goals as well as habits?",
        a: "Yes. Goals track progress towards a target, like a distance or a number of sessions, and sit alongside your daily habits.",
      },
    ],
    featureList: ["One-tap habit check-off", "Streaks and best runs", "Goal tracker", "Evening check-in and daily score", "Weekly review with predictions"],
  },

  "expense-tracker": {
    slug: "expense-tracker",
    name: "Expense tracker",
    title: "Expense Tracker & Budget App in ₹, No Bank Login | Dovie",
    description:
      "Track income and expenses in rupees, set monthly budgets, never miss a bill and see a month-end forecast. No bank login, cards or SMS access, ever.",
    keywords: [
      "expense tracker",
      "expense tracker app",
      "expense tracker India",
      "budget planner",
      "budget app India",
      "money manager app",
      "income and expense tracker",
      "personal finance app",
      "bill reminder app",
    ],
    eyebrow: "Expense tracker & budget planner",
    h1: "Know where your money goes,",
    accent: "without a bank login.",
    intro:
      "Log income and expenses in rupees, set gentle monthly budgets, keep track of bills and see where the month is heading before it ends. You add everything yourself, so Dovie never sees your bank, cards or messages.",
    tint: "bg-butter",
    highlights: [
      "Income, spending and what's left",
      "Budgets by category",
      "Bill due dates and reminders",
      "Month-end spending forecast",
    ],
    sections: [
      {
        heading: "Money in, money out, and what's left",
        body: [
          "Dovie's money page starts with four numbers: what you've earned this month, what you've spent, what's left after the bills still due, and how much you've saved towards your goals. Every income and expense sits in one list for the month, with a filter for money in and money out.",
          "Spending is grouped by category (Food, Groceries, Transport, Home, Health and more) so you can see where it went at a glance, with a budget bar for any category you've set a limit on.",
        ],
      },
      {
        heading: "A forecast before the month ends",
        body: [
          "From your pace so far and your last three months, Dovie predicts what you'll have spent by the end of the month, with a likely range. It flags budgets that are on track, getting close or likely to go over, and estimates when you'll reach each savings goal.",
          "A savings coach finds the categories running above your usual, the small purchases that add up and the recurring bills worth a second look, then suggests realistic ways to keep more each month.",
        ],
      },
      {
        heading: "Mood × Money: why you spend",
        body: [
          "Dovie is the only expense tracker that also knows how your day felt. Mood × Money compares your evening check-ins with your spending and shows patterns like \"on low-energy days you spend 2× more, mostly on Food\", worked out privately on your device.",
        ],
      },
      {
        heading: "Private by design",
        body: [
          "There's no bank linking, no card details and no SMS reading. That means nothing to leak and no third party watching your transactions. Dovie is for tracking and planning only and is not financial advice.",
        ],
      },
    ],
    steps: [
      { title: "Add your income", body: "Log your salary, freelance work or any money that comes in, in rupees." },
      { title: "Add expenses as they happen", body: "Amount, category, done. Add bills with their due dates." },
      { title: "Check the forecast", body: "See what's left, which budgets need care and where the month is heading." },
    ],
    faq: [
      {
        q: "Is Dovie a good expense tracker for India?",
        a: "Dovie tracks everything in rupees, with categories, monthly budgets, bills with due dates, savings goals and a month-end forecast. It's free while in beta.",
      },
      {
        q: "Does Dovie connect to my bank or read my SMS?",
        a: "No. You add income and expenses yourself. Dovie never asks for bank logins, card details, statements or SMS access.",
      },
      {
        q: "Can I track income as well as expenses?",
        a: "Yes. Log salary, freelance, business, gifts, refunds or interest. Dovie shows what you've earned, what you've spent and what's left after the bills still due this month.",
      },
      {
        q: "Can I set a monthly budget?",
        a: "Yes. Set a monthly limit for any category. Dovie shows how much is used and warns gently when a budget is getting close or likely to go over.",
      },
      {
        q: "Will it remind me about bills?",
        a: "Yes. Add bills with a due date and how often they repeat. Bills due in the next week appear on your Today page, and marking a recurring bill paid moves it to its next due date.",
      },
    ],
    featureList: ["Income and expense tracking in INR", "Monthly budgets by category", "Bills with due dates", "Savings goals", "Month-end spending forecast", "AI savings coach", "Mood × Money patterns"],
  },

  "daily-planner": {
    slug: "daily-planner",
    name: "Daily planner",
    title: "Free Daily Planner & To-Do List App | Dovie",
    description:
      "Plan your day with a free daily planner and to-do list: pick your top three, roll unfinished tasks into tomorrow and end with a short evening check-in.",
    keywords: [
      "daily planner",
      "daily planner app",
      "to-do list app",
      "free daily planner",
      "day planner",
      "task planner",
      "productivity app",
      "weekly planner",
    ],
    eyebrow: "Daily planner & to-do list",
    h1: "A daily planner for",
    accent: "days that don't go to plan.",
    intro:
      "Pick your top three, keep the rest of the list out of the way, and let unfinished tasks roll gently into tomorrow. A short evening check-in closes the day so you can start fresh.",
    tint: "bg-secondary",
    highlights: ["Your top three, first", "Unfinished tasks roll over", "Time-blocked day view", "Evening check-in"],
    sections: [
      {
        heading: "Start with three things",
        body: [
          "A long to-do list is easy to write and hard to face. Dovie's daily planner asks you to star the three things that matter most today. They stay at the top; everything else waits quietly below.",
          "Anything you don't finish rolls into tomorrow automatically, without any red overdue badges.",
        ],
      },
      {
        heading: "See the shape of your day",
        body: [
          "The Planner gives you a day view to block out time for focus, errands and rest, next to your tasks and calendar. A focus timer helps you work in calm, short sessions.",
        ],
      },
      {
        heading: "Close the day kindly",
        body: [
          "Each evening, a short check-in asks how the day felt. Dovie combines your priorities, other tasks, habits and movement into a daily score. Nothing planned means no score, so you're never punished for a rest day.",
          "The weekly review then shows the week's plans done, habit rhythm, sleep and focus, with predictions for the week ahead.",
        ],
      },
    ],
    steps: [
      { title: "Star your top three", body: "Pick the three tasks that would make today feel good." },
      { title: "Plan the time", body: "Block out focus time in the day view, or just work down the list." },
      { title: "Check in tonight", body: "Rate the day in a tap. Unfinished tasks roll into tomorrow." },
    ],
    faq: [
      {
        q: "Is Dovie a free daily planner app?",
        a: "Yes. Dovie's daily planner and to-do list are free while in beta, along with its habit tracker, expense tracker and journal.",
      },
      {
        q: "What happens to tasks I don't finish?",
        a: "They roll into tomorrow on their own, so nothing gets lost and there are no overdue warnings.",
      },
      {
        q: "Does it have a calendar or weekly view?",
        a: "Yes. There's a calendar, a time-blocked day view in the Planner and a weekly review that looks back on the week and predicts the next one.",
      },
      {
        q: "Can I use Dovie as a simple to-do list?",
        a: "Yes. Add tasks, star the important ones and tick them off. You can ignore the other features until you want them.",
      },
      {
        q: "Does it work offline or on my phone?",
        a: "Dovie works in the browser on Android, iPhone and desktop. Add it to your home screen to open it like an app.",
      },
    ],
    featureList: ["Daily to-do list with top three priorities", "Automatic task roll-over", "Time-blocked day planner", "Calendar", "Focus timer", "Evening check-in and daily score", "Weekly review"],
  },

  "mood-tracker": {
    slug: "mood-tracker",
    name: "Mood tracker",
    title: "Mood Tracker App with Sleep & Energy Tracking | Dovie",
    description:
      "A free mood tracker with sleep, energy and water tracking. Check in each evening in one tap and see how your mood connects to your habits and spending.",
    keywords: [
      "mood tracker",
      "mood tracker app",
      "mood journal",
      "sleep tracker",
      "energy tracker",
      "water intake tracker",
      "wellness app",
      "self-care app",
    ],
    eyebrow: "Mood, sleep & energy tracker",
    h1: "A mood tracker that",
    accent: "connects the dots.",
    intro:
      "Check in each evening with a single tap, add your sleep, energy and water, and let Dovie show how the way you feel lines up with your days, your habits and even your spending.",
    tint: "bg-mint",
    highlights: ["One-tap evening check-in", "Sleep, energy and water", "Mood × Money patterns", "Private and ad-free"],
    sections: [
      {
        heading: "A check-in that takes five seconds",
        body: [
          "Rate your day from Rough to Great, add an optional note and you're done. Log sleep hours, energy and glasses of water from the Wellness page whenever you like.",
        ],
      },
      {
        heading: "See what moves your mood",
        body: [
          "Because Dovie also holds your plans, habits, movement and focus time, your mood isn't tracked in isolation. The weekly review shows your rest and energy next to what you got done, so patterns become easier to notice.",
        ],
      },
      {
        heading: "Mood × Money",
        body: [
          "Dovie lines up your check-ins with your spending and tells you, gently, if low-mood days, low-energy days or short nights tend to cost you more, and in which category. It's worked out on your device and shows patterns, not causes.",
          "Dovie is a self-care tool, not a medical app. If you're struggling, please reach out to someone you trust or a professional.",
        ],
      },
    ],
    steps: [
      { title: "Check in tonight", body: "Pick how today felt, from Rough to Great." },
      { title: "Add sleep and energy", body: "A few taps on Wellness: hours slept, energy, water." },
      { title: "Notice patterns", body: "After ten days, see how mood lines up with your days and spending." },
    ],
    faq: [
      {
        q: "Is Dovie a free mood tracker?",
        a: "Yes. Mood, sleep, energy and water tracking are free while Dovie is in beta.",
      },
      {
        q: "How does Mood × Money work?",
        a: "Dovie compares your evening check-ins with the expenses you log. After ten matched days it shows patterns, such as spending more on low-energy days, and roughly what that costs each month.",
      },
      {
        q: "Is my mood data private?",
        a: "Yes. Your check-ins are only visible to you, Dovie shows no ads and never sells your data. Mood × Money is worked out on your own device.",
      },
      {
        q: "Can I track sleep and water too?",
        a: "Yes. Log hours of sleep, energy from 1 to 5 and glasses of water each day on the Wellness page.",
      },
      {
        q: "Is Dovie a medical or therapy app?",
        a: "No. Dovie is a gentle self-care and planning tool. It doesn't diagnose or treat anything. Please talk to a professional if you need support.",
      },
    ],
    featureList: ["One-tap mood check-in", "Sleep tracker", "Energy tracker", "Water intake tracker", "Mood × Money spending patterns", "Weekly review"],
  },

  "private-journal": {
    slug: "private-journal",
    name: "Private journal",
    title: "Private Journal App with Daily Prompts | Dovie",
    description:
      "Write in a private dot-grid journal with daily prompts and a gratitude line. Only you can read it when signed in, and it is never used for ads or insights. Free on any device.",
    keywords: [
      "private journal app",
      "dot grid journal",
      "digital diary",
      "online diary",
      "journal app",
      "gratitude journal",
      "secure diary app",
      "journaling app",
    ],
    eyebrow: "Private journal",
    h1: "A journal just",
    accent: "for you.",
    intro:
      "Write freely on a dot-grid page that is yours alone. Gentle prompts and a gratitude line help on the days you don't know where to start.",
    tint: "bg-sky",
    highlights: ["A dot-grid notebook page", "Only you can read it when signed in", "Daily prompts and gratitude", "Never used for ads or insights"],
    sections: [
      {
        heading: "A page for every day",
        body: [
          "Your journal is an open book: contents on the left, today's dot-grid page on the right. Write anything, note how you feel, and turn back to any earlier page whenever you like.",
          "Pages are saved to your account and can only be read while you are signed in. There is no passphrase to remember. They are not end-to-end encrypted, so treat the journal like the rest of your account and keep your sign-in safe.",
        ],
      },
      {
        heading: "Prompts for blank-page days",
        body: [
          "A daily prompt and a short gratitude line give you somewhere to start. A sentence is plenty. Over time, the habit of writing a little matters more than writing a lot.",
        ],
      },
      {
        heading: "Your words stay out of everything else",
        body: [
          "Dovie's insights and AI features use numbers like totals and completions, never journal text. You can export everything or delete your account in one step.",
        ],
      },
    ],
    steps: [
      { title: "Open today's page", body: "There is nothing to set up. Sign in and the page is waiting." },
      { title: "Write a line", body: "Use the daily prompt or just say how today went." },
      { title: "Come back anytime", body: "Search or turn back to any earlier page, on any device." },
    ],
    faq: [
      {
        q: "Is Dovie's journal really private?",
        a: "It is private to your account: pages can only be read while you are signed in, and are never used for insights, AI or ads. They are not end-to-end encrypted.",
      },
      {
        q: "Do I need a passphrase?",
        a: "No. Sign in to Dovie and your journal opens straight away.",
      },
      {
        q: "Does Dovie use my journal for AI or ads?",
        a: "No. Journal text is never used for insights, AI features or ads. Dovie shows no ads at all.",
      },
      {
        q: "Can I write a gratitude journal in Dovie?",
        a: "Yes. Each entry has room for a short gratitude line alongside a daily prompt.",
      },
      {
        q: "Is the journal app free?",
        a: "Yes. The private journal is free while Dovie is in beta and works on Android, iPhone and desktop browsers.",
      },
    ],
    featureList: ["Dot-grid notebook pages", "Daily writing prompts", "Gratitude line", "Mood for each page", "Search past pages", "Export and delete"],
  },
};
