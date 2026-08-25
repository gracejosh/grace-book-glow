export type RadioStation = {
  id: string;
  name: string;
  tagline: string;
  url: string;
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "k-love",
    name: "K-LOVE",
    tagline: "Positive, encouraging worship",
    url: "https://maestro.emfcdn.com/stream/k-love/tunein/aac",
  },
  {
    id: "air1",
    name: "Air1",
    tagline: "Worship now",
    url: "https://maestro.emfcdn.com/stream/air1/tunein/aac",
  },
  {
    id: "bbn",
    name: "BBN",
    tagline: "Bible teaching & hymns",
    url: "https://bbnradio-lh.akamaihd.net/i/BBNRadio_1@174570/master.m3u8",
  },
];

export type Verse = { reference: string; text: string };

export const VERSES: Verse[] = [
  {
    reference: "2 Corinthians 12:9",
    text: "My grace is sufficient for you, for my power is made perfect in weakness.",
  },
  {
    reference: "Lamentations 3:22-23",
    text: "His mercies never come to an end; they are new every morning; great is your faithfulness.",
  },
  {
    reference: "Psalm 119:105",
    text: "Your word is a lamp to my feet and a light to my path.",
  },
  {
    reference: "Isaiah 40:31",
    text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.",
  },
  {
    reference: "Ephesians 2:8",
    text: "For by grace you have been saved through faith, and this is not your own doing; it is the gift of God.",
  },
  {
    reference: "Philippians 4:7",
    text: "And the peace of God, which surpasses all understanding, will guard your hearts and minds.",
  },
  {
    reference: "Romans 8:28",
    text: "And we know that for those who love God all things work together for good.",
  },
];

export function verseOfTheDay(date = new Date()): Verse {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return VERSES[dayIndex % VERSES.length];
}

export type Book = {
  id: string;
  title: string;
  author: string;
  blurb: string;
  price: number | null;
  pdfUrl?: string;
  epubUrl?: string;
  appleBooksUrl?: string;
};

export const BOOKS: Book[] = [
  {
    id: "grace-abounding",
    title: "Grace Abounding to the Chief of Sinners",
    author: "John Bunyan",
    blurb: "A raw spiritual autobiography of mercy meeting the worst of men.",
    price: null,
    pdfUrl: "https://www.gutenberg.org/ebooks/654.pdf.images",
    epubUrl: "https://www.gutenberg.org/ebooks/654.epub.noimages",
  },
  {
    id: "pilgrims-progress",
    title: "The Pilgrim's Progress",
    author: "John Bunyan",
    blurb: "The allegory of Christian's journey from the City of Destruction.",
    price: null,
    pdfUrl: "https://www.gutenberg.org/ebooks/131.pdf.images",
    epubUrl: "https://www.gutenberg.org/ebooks/131.epub.noimages",
  },
  {
    id: "confessions",
    title: "Confessions",
    author: "Augustine of Hippo",
    blurb: "Restless hearts, relentless grace — the first spiritual memoir.",
    price: null,
    pdfUrl: "https://www.gutenberg.org/ebooks/3296.pdf.images",
    epubUrl: "https://www.gutenberg.org/ebooks/3296.epub.noimages",
  },
  {
    id: "imitation-of-christ",
    title: "The Imitation of Christ",
    author: "Thomas à Kempis",
    blurb: "Four books of devotional counsel on the inner life.",
    price: null,
    epubUrl: "https://www.gutenberg.org/ebooks/1653.epub.noimages",
    pdfUrl: "https://www.gutenberg.org/ebooks/1653.pdf.images",
  },
  {
    id: "morning-and-evening",
    title: "Morning by Morning",
    author: "Charles H. Spurgeon",
    blurb: "A year of morning devotions from the Prince of Preachers.",
    price: 6.99,
    appleBooksUrl: "https://books.apple.com/us/book/morning-by-morning/id1097163694",
  },
  {
    id: "grace-book-companion",
    title: "The Grace Book Companion",
    author: "Grace Book Press",
    blurb: "A 40-day guided study on grace, with room for your own notes.",
    price: 9.99,
    appleBooksUrl: "https://books.apple.com/us/genre/books-religion-spirituality/id9017",
  },
  {
    id: "hymns-of-mercy",
    title: "Hymns of Mercy",
    author: "Compiled by Grace Book",
    blurb: "120 treasured hymns with history and Scripture references.",
    price: 4.99,
    appleBooksUrl: "https://books.apple.com/us/genre/books-religion-spirituality/id9017",
  },
  {
    id: "practice-of-presence",
    title: "The Practice of the Presence of God",
    author: "Brother Lawrence",
    blurb: "Short letters on keeping company with God in ordinary work.",
    price: null,
    pdfUrl: "https://www.gutenberg.org/ebooks/5657.pdf.images",
    epubUrl: "https://www.gutenberg.org/ebooks/5657.epub.noimages",
  },
];

export type Course = {
  id: string;
  title: string;
  teacher: string;
  lessons: number;
  minutes: number;
  description: string;
  youtubeId: string;
};

export const COURSES: Course[] = [
  {
    id: "grace-foundations",
    title: "Foundations of Grace",
    teacher: "Grace Book Teaching",
    lessons: 6,
    minutes: 48,
    description: "What grace is, what it is not, and why it changes everything.",
    youtubeId: "ZLLWJDvIRAw",
  },
  {
    id: "prayer-school",
    title: "Prayer School",
    teacher: "Grace Book Teaching",
    lessons: 8,
    minutes: 62,
    description: "Learn to pray Scripture, lament honestly, and listen well.",
    youtubeId: "2Q6dpFsSXf8",
  },
  {
    id: "reading-the-gospels",
    title: "Reading the Gospels",
    teacher: "Grace Book Teaching",
    lessons: 5,
    minutes: 40,
    description: "How the four accounts fit together and how to study them.",
    youtubeId: "3dEh25pduQ8",
  },
  {
    id: "psalms-for-hard-seasons",
    title: "Psalms for Hard Seasons",
    teacher: "Grace Book Teaching",
    lessons: 7,
    minutes: 55,
    description: "Songs for grief, waiting, and unexpected joy.",
    youtubeId: "j9phNEaPrv8",
  },
  {
    id: "romans-walkthrough",
    title: "Romans, Verse by Verse",
    teacher: "Grace Book Teaching",
    lessons: 12,
    minutes: 130,
    description: "A patient walk through Paul's clearest case for the gospel.",
    youtubeId: "0SVTl4Xa5fY",
  },
  {
    id: "hymn-history",
    title: "The Stories Behind the Hymns",
    teacher: "Grace Book Teaching",
    lessons: 4,
    minutes: 34,
    description: "Amazing Grace, It Is Well, and the lives behind the lyrics.",
    youtubeId: "CDdvReNKKuk",
  },
];
