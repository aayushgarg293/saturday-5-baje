/**
 * Rediffit's news, as data (sites/portal.ts shows it): the stories of the day,
 * each a headline, a line under it, and the article. Made up, in the spirit
 * of the time; look-alike names for people and brands, as everywhere in the
 * game. Edit freely: a new story appears on the front page by itself.
 */

export type Story = {
  /** Its address on the site: www.rediffit.com/news/<id>. */
  id: string;
  section: "India" | "Cricket" | "Business" | "Movies" | "Rajasthan" | "Tech" | "Life";
  headline: string;
  /** The line under the headline. */
  dek: string;
  /** The article, a paragraph per line. */
  body: string[];
};

export const STORIES: Story[] = [
  {
    id: "heroes", section: "Cricket",
    headline: "Team India's T20 heroes get a hero's welcome",
    dek: "Open-top bus parade in Mumbai draws lakhs; traffic stopped for six hours",
    body: [
      "MUMBAI: The city came to a standstill on Monday as the young Indian team that won the first T20 World Cup rode an open-top bus from the airport to Wankhede stadium.",
      "Fans climbed trees, lamp posts and bus shelters for a glimpse of captain M.S. Dhony, whose long hair has already started a fashion in barber shops across the country.",
      "\"We did not expect this,\" said an emotional Y. Singhh, who hit six sixes in an over during the tournament. \"This cup is for the people of India.\"",
      "The Board has announced a cash reward for every player. Several state governments have promised plots of land.",
    ],
  },
  {
    id: "sensex", section: "Business",
    headline: "Sensex crosses 19,000 for the first time",
    dek: "Markets cheer as foreign money pours in; brokers distribute sweets",
    body: [
      "MUMBAI: The Bombay Stock Exchange's Sensex crossed the 19,000 mark for the first time on Friday, gaining over 400 points in a single day.",
      "Brokers on Dalal Street distributed laddoos. \"Every chaiwala is now asking me for tips,\" said one.",
      "Experts warned small investors not to get carried away. \"What goes up can also come down,\" said an analyst, adding that he himself had bought more shares that morning.",
    ],
  },
  {
    id: "jabwemate", section: "Movies",
    headline: "Jab We Mate runs houseful in its third week",
    dek: "Small-budget romance beats the big releases; train scene a favourite with college crowds",
    body: [
      "MUMBAI: Nobody expected much from Jab We Mate, a love story set largely on a train. Three weeks later, cinema halls across the country are still putting up the HOUSEFUL board.",
      "Young audiences have taken to the chatty heroine Geet, whose lines are being repeated in colleges and on Yorkut scrapbooks.",
      "Music stores report that the film's songs are selling fast, though \"most young people just download them\", one shopkeeper complained.",
      "Trade watchers say the film proves that \"a good story can still beat a big star.\"",
    ],
  },
  {
    id: "monsoon", section: "Rajasthan",
    headline: "Ajmer sizzles at 45°C; monsoon still a week away",
    dek: "Pre-monsoon clouds over the Aravallis; Ana Saagar lake at its lowest",
    body: [
      "JAIPUR: The mercury touched 45 degrees in Ajmer and Bhilwara on Friday, and the Met office says the monsoon will reach Rajasthan only by the end of the month.",
      "In Ajmer, the Ana Saagar lake is at its lowest in years. Boatmen say the evening crowds come anyway, for the breeze.",
      "Farmers in Bhilwara and Kekri are waiting to sow. \"One good shower and we start,\" said one.",
      "The water department has asked people not to wash scooters with hose pipes, and coolers are sold out in Naya Bazaar.",
    ],
  },
  {
    id: "phones", section: "Tech",
    headline: "Camera phones are this summer's hot buy",
    dek: "1.3 megapixels, Bluetooth and a music player: shops can't keep them in stock",
    body: [
      "NEW DELHI: Results are out and the vacations are on, and the thing every teenager wants is a mobile phone with a camera.",
      "Shops in Karol Bagh and Ajmer's Naya Bazaar report long waits for the Nokiya 6600-series and the new Sony Erricson music phones, priced from Rs 7,999.",
      "Teenagers say the most important feature is Bluetooth, \"for sharing songs and videos in class\". Parents say the most important feature is the price.",
      "Ringtone downloads, at Rs 5 a song, are said to be the fastest growing business in the country.",
    ],
  },
  {
    id: "pushkar", section: "Rajasthan",
    headline: "Pushkar fair: camels, foreigners and the longest moustache",
    dek: "Lakhs expected at the camel fair next month; hotels already full",
    body: [
      "PUSHKAR: Preparations are in full swing for the Pushkar camel fair, which will see thousands of camels and lakhs of visitors on the banks of the holy lake.",
      "The moustache competition remains the most popular event with foreign tourists. Last year's winner, from a village near Beawar, has been growing his for 22 years.",
      "Buses from Ajmer will run every fifteen minutes during the fair. The roadways department has warned of crowds on the Nag Pahar road.",
    ],
  },
  {
    id: "scrapbooks", section: "Life",
    headline: "Is your child spending too much time on 'scrapbooks'?",
    dek: "Parents worry as teenagers flock to Yorkut; cafe owners say Saturdays are the busiest",
    body: [
      "Across small-town India, a new worry has joined board exams and cricket on parents' lists: Yorkut.",
      "The social networking website, where young people write 'scraps' and 'testimonials' to each other, now has lakhs of users in India alone.",
      "\"He says he is going for tuition and he goes to the cyber cafe,\" said a mother in Ajmer, who asked not to be named.",
      "Cyber cafe owners say they see no problem. \"Saturday 5 o'clock, every booth is full,\" said one. \"They are only chatting with friends. And it is Rs 20 an hour.\"",
      "Experts suggest parents create their own Yorkut profiles. Teenagers suggest they do not.",
    ],
  },
];

/** Today's horoscope, for the box on the front page: every sign gets good news, as they did. */
export const HOROSCOPE: [string, string][] = [
  ["Aries", "A journey is likely. Avoid arguments with elders."],
  ["Leo", "Someone special will message you today. Reply quickly!"],
  ["Libra", "Money matters improve. A good day for studies."],
  ["Scorpio", "An old friend gets in touch. Keep your promises."],
];

/** The poll on the front page, and how the votes stood before yours. */
export const POLL = {
  question: "Best film of the year so far?",
  options: [["Jab We Mate", 41], ["Chak De Indya", 33], ["Bhool Bhulaiyya", 15], ["Partnerr", 11]] as [string, number][],
};
