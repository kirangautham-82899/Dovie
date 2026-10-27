// Content for the public keyword pages (/habit-tracker, /expense-tracker...).
// Each page targets one search intent with its own title, description, H1,
// body copy and FAQ. FAQ answers are mirrored in FAQPage structured data, so
// they must match the visible text and describe only what Dovie really does.

export const GUIDE_SLUGS = [
  "habit-tracker",
  "routine-tracker",
  "goal-tracker",
  "daily-planner",
  "money-manager",
  "expense-tracker",
  "budget-planner",
  "bill-reminder",
  "mood-tracker",
  "fitness-tracker",
  "private-journal",
  "life-planner",
] as const;
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
  /** The closest pages, shown under "Also in Dovie". Defaults to the first few others. */
  related?: GuideSlug[];
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

  "money-manager": {
    slug: "money-manager",
    name: "Money manager",
    title: "Money Manager App in ₹: Income, Bills & Savings | Dovie",
    description:
      "A free money manager app for India. See income, spending, bills and savings in one place, with a month-end forecast and no bank login or SMS access.",
    keywords: [
      "money manager",
      "money manager app",
      "money management app",
      "money maintainer app",
      "personal finance app",
      "personal finance app India",
      "money tracker app",
      "manage money app",
    ],
    eyebrow: "Money manager app",
    h1: "Your whole money picture,",
    accent: "on one calm page.",
    intro:
      "Dovie keeps your income, spending, bills, budgets and savings goals together, in rupees, so you always know where you stand this month and where it's heading. You add everything yourself, so your bank and SMS stay private.",
    tint: "bg-mint",
    highlights: [
      "Earned, spent, left and saved at a glance",
      "Bills and budgets in the same place",
      "A forecast for the end of the month",
      "No bank login, cards or SMS",
    ],
    sections: [
      {
        heading: "What a money manager should actually tell you",
        body: [
          "Most money apps show a long list of transactions and leave the thinking to you. A good money manager answers four questions first: how much came in, how much went out, how much is left once this month's bills are paid, and how much you've put aside. Dovie puts those four numbers at the top of the page as sticky notes, so the answer is there the moment you open it.",
          "Below them, one list holds every income and expense for the month, with a quick filter for money in and money out, and a breakdown of where the money went by category.",
        ],
      },
      {
        heading: "Plan ahead, not just look back",
        body: [
          "Bills, budgets and savings goals sit next to your spending. Add a bill with its due date and how often it repeats and it shows up on your Today page and your calendar before it's due. Give a category a monthly budget and Dovie shows how much of it is used. Create a savings goal and add to it whenever you set money aside.",
          "From your pace so far and your last three months, Dovie forecasts where the month will land, flags budgets likely to go over and estimates when each savings goal will be reached.",
        ],
      },
      {
        heading: "Why there's no bank linking",
        body: [
          "Linking a bank or giving an app your SMS means a third party can see every transaction you make. Dovie never asks for either. Adding an expense takes a few seconds, and many people find that the small act of writing it down is what makes them spend more thoughtfully. Dovie is for tracking and planning only, not financial advice.",
        ],
      },
    ],
    steps: [
      { title: "Add what came in", body: "Salary, freelance work, a refund: log it in rupees with where it came from." },
      { title: "Add bills and budgets", body: "Due dates for bills, monthly limits for the categories you care about." },
      { title: "Glance, don't dig", body: "Open Money to see earned, spent, left and saved, plus the forecast." },
    ],
    faq: [
      {
        q: "What is the best money manager app without bank linking?",
        a: "Dovie is a free money manager that works entirely from what you add yourself. It tracks income, expenses, bills, budgets and savings goals in rupees and never asks for bank logins, cards or SMS access.",
      },
      {
        q: "Is Dovie's money manager free?",
        a: "Yes. Dovie is free while in beta, with no limit on how many expenses, bills or goals you add.",
      },
      {
        q: "Does it work in rupees?",
        a: "Yes. Every amount in Dovie is in Indian rupees, with categories that fit everyday spending in India.",
      },
      {
        q: "Can it tell me how much I'll have left this month?",
        a: "Yes. Dovie shows what's left after the bills still due this month and forecasts where your spending will land by month end.",
      },
      {
        q: "Can I save towards something specific?",
        a: "Yes. Create a savings goal with a target and an optional date, add to it as you save, and Dovie estimates when you'll get there.",
      },
    ],
    featureList: ["Earned, spent, left and saved summary", "Income and expense tracking in INR", "Bills with due dates", "Monthly budgets", "Savings goals", "Month-end forecast"],
    related: ["expense-tracker", "budget-planner", "bill-reminder", "goal-tracker"],
  },

  "budget-planner": {
    slug: "budget-planner",
    name: "Budget planner",
    title: "Monthly Budget Planner App, Free in ₹ | Dovie",
    description:
      "Plan a monthly budget by category, see how much is used as you spend, and get a gentle heads-up before a budget runs out. Free, private, in rupees.",
    keywords: [
      "budget planner",
      "budget planner app",
      "monthly budget planner",
      "budget app",
      "budget app India",
      "free budget app",
      "household budget app",
      "budget tracker",
    ],
    eyebrow: "Monthly budget planner",
    h1: "A budget you can",
    accent: "actually keep.",
    intro:
      "Set a monthly limit for the categories that matter, like Food, Transport or Shopping, and Dovie shows how much is used as you go and whether you're on track, getting close or likely to go over. No spreadsheets, no bank login.",
    tint: "bg-butter",
    highlights: [
      "Monthly limits by category",
      "On track, close or over, at a glance",
      "Forecast before the month ends",
      "Change a budget any time",
    ],
    sections: [
      {
        heading: "Start with two or three budgets, not twenty",
        body: [
          "The budgets people stick to are short. Pick the two or three categories where money tends to slip away, often eating out, shopping or travel, and give each one a monthly limit. Everything else is still tracked; it just doesn't need a number yet.",
          "In Dovie a budget is one form: choose the category, type the monthly limit, done. Setting the same category again simply replaces the old limit, so adjusting next month takes seconds.",
        ],
      },
      {
        heading: "See trouble coming, not after it's happened",
        body: [
          "Each budget gets a bar showing how much is used. Dovie also looks at your pace so far this month and your last three months to say whether a budget is on track, getting close or likely to go over, while there's still time to do something about it.",
          "A savings coach points out categories running above your usual and small, frequent purchases that add up, and suggests realistic amounts to trim.",
        ],
      },
      {
        heading: "Budgets with the rest of your money",
        body: [
          "Your budgets live next to your income, bills and savings goals, so the page also shows what's left after bills and how your savings are coming along. It's a full budget planner and money manager in one, and it never connects to your bank.",
        ],
      },
    ],
    steps: [
      { title: "Pick a category", body: "Choose where money slips away most, like Food or Shopping." },
      { title: "Set a monthly limit", body: "Type an amount in rupees. You can change it any time." },
      { title: "Spend as normal", body: "Add expenses as they happen and watch the bar and the forecast." },
    ],
    faq: [
      {
        q: "How do I make a monthly budget in Dovie?",
        a: "Open Money, choose Budget, pick a category and enter a monthly limit in rupees. Dovie shows how much of it you've used as you add expenses.",
      },
      {
        q: "What happens if I go over a budget?",
        a: "Nothing dramatic. The bar turns to show it's over, and the forecast and savings coach help you plan the rest of the month.",
      },
      {
        q: "Can I change a budget later?",
        a: "Yes. Setting a budget for the same category again replaces its limit, and you can remove a budget whenever you like.",
      },
      {
        q: "Is this budget app free?",
        a: "Yes. Dovie is free while in beta and works on Android, iPhone and desktop browsers.",
      },
    ],
    featureList: ["Monthly budgets by category", "Budget status: on track, close or over", "Month-end spending forecast", "Savings coach", "Income, bills and savings in one place"],
    related: ["money-manager", "expense-tracker", "bill-reminder", "mood-tracker"],
  },

  "bill-reminder": {
    slug: "bill-reminder",
    name: "Bill reminder",
    title: "Bill Reminder App: Never Miss a Due Date | Dovie",
    description:
      "Add bills with due dates and how often they repeat. Dovie shows what's due on your Today page and calendar, and rolls recurring bills forward when paid.",
    keywords: [
      "bill reminder",
      "bill reminder app",
      "bill tracker",
      "bill due date reminder",
      "recurring bill tracker",
      "rent reminder app",
      "EMI reminder app",
      "bill organizer",
    ],
    eyebrow: "Bill reminder app",
    h1: "Bills that never",
    accent: "sneak up on you.",
    intro:
      "Rent, electricity, internet, phone, EMIs, subscriptions: add each one once with its due date and how often it repeats. Dovie keeps them in view on your Today page and calendar, and moves each recurring bill to its next date when you mark it paid.",
    tint: "bg-sky",
    highlights: [
      "Monthly, weekly, yearly or one-off",
      "Due bills on your Today page",
      "Every bill on your month calendar",
      "One tap to mark paid",
    ],
    sections: [
      {
        heading: "Add a bill once, see it every time it's due",
        body: [
          "A bill in Dovie is a name, an optional amount, a due date and how often it repeats: monthly, weekly, yearly or just once. That's enough for Dovie to place it on every date it falls on, so your calendar shows this month's bills and the months after.",
          "Bills due in the next week appear on your Today page, right where you plan your day, and overdue ones are marked so they stand out.",
        ],
      },
      {
        heading: "Paid is one tap",
        body: [
          "When you've paid, tap Paid. A recurring bill moves straight to its next due date; a one-off bill is cleared. There's nothing to reset and nothing to remember.",
        ],
      },
      {
        heading: "Bills inside your budget",
        body: [
          "Because bills live with the rest of your money, Dovie can show what's left this month after the bills still due, and its forecast and savings coach take recurring bills into account. Subscriptions you've forgotten about are easier to spot when they're all in one list.",
        ],
      },
    ],
    steps: [
      { title: "Add your bills", body: "Name, due date, how often it repeats, and the amount if you know it." },
      { title: "See them coming", body: "Due bills show on Today and every bill appears on your calendar." },
      { title: "Tap Paid", body: "Recurring bills roll to their next due date on their own." },
    ],
    faq: [
      {
        q: "Can Dovie remind me about rent and EMIs?",
        a: "Yes. Add rent, EMIs or any other bill with its due date and set it to repeat monthly. It appears on your Today page as the date gets close.",
      },
      {
        q: "Do I have to enter an amount?",
        a: "No. The amount is optional, which is handy for bills that change every month like electricity.",
      },
      {
        q: "What happens when I mark a bill paid?",
        a: "A recurring bill moves to its next due date; a one-off bill is cleared.",
      },
      {
        q: "Can I see all my bills on a calendar?",
        a: "Yes. Dovie's month calendar shows every bill on the dates it falls due, including repeats.",
      },
    ],
    featureList: ["Bills with due dates", "Monthly, weekly, yearly and one-off repeats", "Due bills on the Today page", "Bills on the month calendar", "One-tap mark as paid"],
    related: ["money-manager", "budget-planner", "expense-tracker", "daily-planner"],
  },

  "goal-tracker": {
    slug: "goal-tracker",
    name: "Goal tracker",
    title: "Goal Tracker App with Milestones & Progress | Dovie",
    description:
      "Set goals with a target and a date, break them into milestones, log progress in a tap and see if you're on track. Free goal tracker for phone and web.",
    keywords: [
      "goal tracker",
      "goal tracker app",
      "goal setting app",
      "goal planner",
      "personal goal tracker",
      "progress tracker app",
      "milestone tracker",
      "free goal tracker",
    ],
    eyebrow: "Goal tracker app",
    h1: "Goals that grow",
    accent: "one step at a time.",
    intro:
      "Give a goal a target, a date and a reason, break it into milestones, and log progress with one tap. Dovie shows whether you're ahead, on track or a little behind, and when you'll get there at your current pace.",
    tint: "bg-lilac",
    highlights: [
      "Targets, dates and milestones",
      "On track, ahead or behind",
      "A streak and a 16-week rhythm",
      "Little celebrations at 25, 50, 75 and 100%",
    ],
    sections: [
      {
        heading: "From a wish to a plan",
        body: [
          "\"Read more\" is a wish. \"Read 12 books by December\" is a goal you can track. In Dovie you give each goal a target and unit, an optional date, a step size for one-tap logging, and a short line about why it matters, which shows on your focus card as a reminder on slow days.",
          "Not sure where to start? Pick an idea like \"Read 12 books this year\" or \"Run 100 km\" and the form fills itself in.",
        ],
      },
      {
        heading: "Know if you're on track",
        body: [
          "Every goal shows a progress ring and a plain line about where it stands: how many days are left and how much a week it takes to land on time, or when you'll finish at your recent pace. A pill marks each goal as ahead, on track or a little behind.",
          "Milestones turn a big goal into stops along the way, and a 16-week heatmap shows the rhythm of your progress across every goal.",
        ],
      },
      {
        heading: "Goals, habits and the rest of your day",
        body: [
          "Goals sit with your daily habits and fitness goals, and progress feeds your weekly review. You can pin one goal as your focus so it's the first thing you see.",
        ],
      },
    ],
    steps: [
      { title: "Set the goal", body: "A target, a unit, an optional date and why it matters." },
      { title: "Add milestones", body: "A few stops along the way make a big goal feel close." },
      { title: "Log a step", body: "One tap adds progress; add a note or a past date when you like." },
    ],
    faq: [
      {
        q: "Is Dovie a free goal tracker?",
        a: "Yes. Dovie is free while in beta, with no limit on the number of goals.",
      },
      {
        q: "Can I break a goal into milestones?",
        a: "Yes. Add milestones when you create a goal or later, and tick them off as you reach them.",
      },
      {
        q: "How does Dovie know if I'm on track?",
        a: "For goals with a target and a date, Dovie compares your progress with where a steady pace would put you today, and tells you how much a week it takes to finish on time.",
      },
      {
        q: "Can I track goals without a deadline?",
        a: "Yes. A goal can be open-ended. Dovie still tracks your progress and estimates when you'll finish at your recent pace.",
      },
    ],
    featureList: ["Goals with targets and dates", "Milestones", "Pace and on-track status", "One-tap progress logging", "Focus goal", "Progress heatmap and streak"],
    related: ["habit-tracker", "fitness-tracker", "daily-planner", "life-planner"],
  },

  "routine-tracker": {
    slug: "routine-tracker",
    name: "Routine tracker",
    title: "Daily Routine Tracker & Habit App, Free | Dovie",
    description:
      "Build a morning and evening routine with small habits, time blocks and a one-tap evening check-in. A free daily routine and habit app for phone and web.",
    keywords: [
      "routine tracker",
      "daily routine app",
      "habit app",
      "good habits app",
      "morning routine app",
      "daily routine planner",
      "self improvement app",
      "build habits app",
    ],
    eyebrow: "Daily routine & habit app",
    h1: "A daily routine that",
    accent: "bends with real life.",
    intro:
      "Turn the routine you want into a few tiny habits, give them a place in your day with time blocks, and close each evening with a one-tap check-in. Dovie helps the routine stick without punishing the days it doesn't.",
    tint: "bg-blush",
    highlights: [
      "Tiny habits, ticked in one tap",
      "Time blocks for the parts that need space",
      "An evening check-in in seconds",
      "A weekly look at your rhythm",
    ],
    sections: [
      {
        heading: "Routines are just habits in an order",
        body: [
          "A morning routine like \"water, stretch, plan the day\" is three small habits done in a row. Add each one to Dovie as a habit and tick them off as you go. Your streak and best run update on their own, and missing a day never wipes out your best.",
          "For the parts that need real time, such as a workout, a study hour or a proper lunch break, add a time block so it has a place in your day and on your calendar.",
        ],
      },
      {
        heading: "Close the day in a tap",
        body: [
          "Each evening Dovie asks how the day felt. That one tap, plus your habits and plans, becomes a daily score and feeds a weekly review that shows which days your routine held and what tends to help, like more sleep or a short walk.",
        ],
      },
      {
        heading: "A habit app that stays gentle",
        body: [
          "Dovie is built for people who've tried strict habit apps and bounced off them. There are no red warnings and no guilt, just a clear view of your rhythm and small suggestions when something feels heavy.",
        ],
      },
    ],
    steps: [
      { title: "List your routine", body: "Break it into two or three tiny habits." },
      { title: "Give it time", body: "Add time blocks for the parts that need space in your day." },
      { title: "Check in tonight", body: "One tap on how the day felt; the weekly review does the rest." },
    ],
    faq: [
      {
        q: "Can I build a morning routine in Dovie?",
        a: "Yes. Add each step of the routine as a small habit and tick them off each morning. Time blocks can hold longer parts like exercise.",
      },
      {
        q: "Is Dovie a habit app or a planner?",
        a: "Both. Dovie combines a habit tracker, a daily planner with time blocks, goals, a mood check-in and a weekly review.",
      },
      {
        q: "What if I miss a day?",
        a: "Your current streak restarts, but your best streak is always kept and the weekly review still shows how often you showed up.",
      },
      {
        q: "Is it free?",
        a: "Yes. Dovie is free while in beta and works on Android, iPhone and desktop browsers.",
      },
    ],
    featureList: ["Habit tracking with streaks", "Time blocks", "Evening check-in", "Daily score", "Weekly review"],
    related: ["habit-tracker", "daily-planner", "mood-tracker", "goal-tracker"],
  },

  "fitness-tracker": {
    slug: "fitness-tracker",
    name: "Fitness tracker",
    title: "Free Fitness Tracker: Walks, Runs & Workouts | Dovie",
    description:
      "Track walks, runs, rides and workouts with time, distance and calories, set weekly fitness goals and see your activity next to sleep and mood. Free.",
    keywords: [
      "fitness tracker",
      "fitness tracker app",
      "free fitness tracker",
      "workout tracker",
      "walking tracker app",
      "running tracker",
      "activity tracker",
      "exercise log app",
    ],
    eyebrow: "Fitness & activity tracker",
    h1: "Move a little,",
    accent: "and watch it add up.",
    intro:
      "Record a walk, run, ride, yoga session or strength workout, set simple fitness goals, and see how movement lines up with your sleep, energy and mood. Dovie counts every kind of movement, not just the hard ones.",
    tint: "bg-mint",
    highlights: [
      "Walks, runs, rides, yoga, strength and more",
      "Time, distance, steps and calories",
      "Fitness goals with weekly targets",
      "Movement next to sleep and mood",
    ],
    sections: [
      {
        heading: "Every kind of movement counts",
        body: [
          "Dovie's fitness tracker covers walking, running, cycling, hiking, strength, yoga, HIIT, swimming, sport, dance and anything else you do. Start a session and Dovie keeps time; for outdoor activities on your phone it can follow your route to work out distance and pace.",
          "For the days you just want to note something down, the movement log takes \"walk, 20 minutes\" in a couple of taps.",
        ],
      },
      {
        heading: "Goals that keep you moving",
        body: [
          "Set fitness goals in the units that suit you, like minutes, kilometres or sessions, and log towards them. Your weekly review shows movement minutes alongside plans, habits and sleep, and points out when your energy tends to be higher on days you moved.",
        ],
      },
      {
        heading: "Part of a bigger picture",
        body: [
          "Workouts appear on your month calendar and in your weekly review, next to your habits, mood and money, so you can see how moving fits into the rest of your life.",
        ],
      },
    ],
    steps: [
      { title: "Pick an activity", body: "Walk, run, ride, yoga, strength or anything else." },
      { title: "Start or log it", body: "Track it live, or just log the minutes afterwards." },
      { title: "See it add up", body: "Goals, calendar and the weekly review show your progress." },
    ],
    faq: [
      {
        q: "Is Dovie's fitness tracker free?",
        a: "Yes. Dovie is free while in beta and works in the browser on Android, iPhone and desktop.",
      },
      {
        q: "What activities can I track?",
        a: "Walking, running, cycling, hiking, strength, yoga, HIIT, swimming, sport, dance and other activities, plus a quick log for any movement.",
      },
      {
        q: "Can I set fitness goals?",
        a: "Yes. Set goals in minutes, kilometres, sessions or another unit and log progress towards them.",
      },
      {
        q: "Does it show how exercise affects my mood?",
        a: "Your weekly review compares energy on days you moved with days you didn't, and shows movement next to mood and sleep.",
      },
    ],
    featureList: ["Activity tracking for 11 activity types", "Time, distance, steps and calories", "Movement log", "Fitness goals", "Weekly review with movement insights"],
    related: ["goal-tracker", "habit-tracker", "mood-tracker", "routine-tracker"],
  },

  "life-planner": {
    slug: "life-planner",
    name: "All-in-one planner",
    title: "All-in-One Life Planner App: Habits, Money & More | Dovie",
    description:
      "One free app for your day, habits, goals, money, mood, fitness and journal, with a month calendar and a weekly review. Replace five apps with Dovie.",
    keywords: [
      "all in one planner app",
      "life planner app",
      "life organizer app",
      "productivity app",
      "personal organizer app",
      "self care app",
      "planner and habit tracker",
      "lifestyle app",
    ],
    eyebrow: "All-in-one life planner",
    h1: "One gentle app for",
    accent: "your whole life.",
    intro:
      "Dovie brings your daily plan, habits, goals, money, mood, sleep, fitness and private journal into one place, with a month calendar that shows it all and a weekly review that helps you see what's working.",
    tint: "bg-blush",
    highlights: [
      "Planner, habits, goals and journal",
      "Money, bills and budgets in ₹",
      "Mood, sleep and fitness",
      "A calendar and weekly review that tie it together",
    ],
    sections: [
      {
        heading: "Why one app beats five",
        body: [
          "Most people juggle a to-do app, a habit tracker, an expense tracker, a notes app and something for mood. Each knows one slice of your life, so none of them can tell you that you spend more on tired days or finish more plans after a good night's sleep. Dovie keeps all of it together, which is what makes those connections possible.",
        ],
      },
      {
        heading: "What's inside",
        body: [
          "A daily planner with your top three and time blocks. A habit tracker with streaks. Goals with milestones and pace. A money page with income, expenses, bills, budgets, savings goals and a forecast, all in rupees. A mood, sleep and energy check-in. A fitness tracker. A private journal with daily prompts.",
          "A month calendar shows plans, time blocks, bills, moods and workouts on each day, and the weekly review sums up your week and predicts the next one.",
        ],
      },
      {
        heading: "Calm by design",
        body: [
          "Dovie is built to feel like a notebook rather than a dashboard: sticky notes, soft colours and kind words. No ads, no bank linking and no guilt when a day doesn't go to plan.",
        ],
      },
    ],
    steps: [
      { title: "Plan today", body: "Star your top three and add anything else on your mind." },
      { title: "Track as you go", body: "Tick habits, add expenses, log a workout or a goal step." },
      { title: "Review the week", body: "See what worked, what felt heavy and what's likely next." },
    ],
    faq: [
      {
        q: "What can I do in Dovie?",
        a: "Plan your day, track habits and goals, manage money in rupees, log mood, sleep and fitness, keep a private journal, and see it all on a month calendar and in a weekly review.",
      },
      {
        q: "Is Dovie free?",
        a: "Yes. Dovie is free while in beta, with no ads.",
      },
      {
        q: "Does it work on my phone?",
        a: "Yes. Dovie works in any modern browser on Android and iPhone, and you can add it to your home screen to open it like an app.",
      },
      {
        q: "Is my data private?",
        a: "Dovie never links to your bank or reads your messages, shows no ads, and never uses journal text for insights or AI.",
      },
    ],
    featureList: ["Daily planner", "Habit tracker", "Goal tracker", "Money manager in INR", "Mood and sleep tracker", "Fitness tracker", "Private journal", "Month calendar", "Weekly review"],
    related: ["habit-tracker", "money-manager", "daily-planner", "goal-tracker"],
  },
};
