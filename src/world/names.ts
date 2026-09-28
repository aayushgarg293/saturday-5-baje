/**
 * Every word painted on the street, in one place: shop names, wall ads and
 * film posters. Edit freely: the street picks from these lists (in a fixed
 * shuffled order, so the same shop always gets the same name).
 *
 * Rule from the brief: LOOK-ALIKE names only for real brands, films and
 * shows (Thumbs Upp, not the real thing). Shop names are invented, in the
 * style of the period: a family name or a god's name, then what it sells.
 */

export type ShopName = {
  /** The big painted name, in Hindi. */
  hi: string;
  /** The same in English, smaller underneath. */
  en: string;
  /** What they sell. */
  tag: string;
};

export const SHOP_NAMES: ShopName[] = [
  { hi: "शर्मा जनरल स्टोर", en: "Sharma General Store", tag: "Kirana • Cold Drinks • Dry Fruits" },
  { hi: "गुप्ता मिष्ठान भंडार", en: "Gupta Mishthan Bhandar", tag: "Kachori • Samosa • Jalebi" },
  { hi: "जनता साइकिल स्टोर", en: "Janta Cycle Store", tag: "Repairing • Puncture • Parts" },
  { hi: "बॉम्बे हेयर कटिंग सैलून", en: "Bombay Hair Cutting Saloon", tag: "Hair Cut • Shave • Massage" },
  { hi: "रॉयल टेलर्स", en: "Royal Tailors", tag: "Gents & Ladies • Suit Specialist" },
  { hi: "कृष्णा फोटो स्टूडियो", en: "Krishna Photo Studio", tag: "Passport Photo • Colour Lab" },
  { hi: "लक्ष्मी चूड़ी भंडार", en: "Laxmi Choodi Bhandar", tag: "Bangles • Bindi • Cosmetics" },
  { hi: "जैन मेडिकल स्टोर", en: "Jain Medical Store", tag: "Chemist & Druggist" },
  { hi: "अग्रवाल क्लॉथ हाउस", en: "Agarwal Cloth House", tag: "Suit • Saree • Cut Piece" },
  { hi: "महावीर इलेक्ट्रिकल्स", en: "Mahaveer Electricals", tag: "Fan • Cooler • Wiring" },
  { hi: "श्री बालाजी बर्तन भंडार", en: "Shri Balaji Bartan Bhandar", tag: "Steel • Brass • Pressure Cooker" },
  { hi: "न्यू फैंसी स्टोर", en: "New Fancy Store", tag: "Gift • Toys • Stationery" },
  { hi: "अजमेर स्वीट्स", en: "Ajmer Sweets", tag: "Sohan Halwa • Ghewar • Namkeen" },
  { hi: "सरस्वती बुक डिपो", en: "Saraswati Book Depot", tag: "Guides • Copies • Pen" },
  { hi: "गणेश मोबाइल पॉइंट", en: "Ganesh Mobile Point", tag: "Recharge • Repairing • Cover" },
  { hi: "चौधरी ऑटो पार्ट्स", en: "Chaudhary Auto Parts", tag: "Scooter • Motorcycle" },
  { hi: "भारत टेंट हाउस", en: "Bharat Tent House", tag: "Shaadi • Party • Jagran" },
  { hi: "मोहन पान भंडार", en: "Mohan Paan Bhandar", tag: "Meetha Paan • Cold Drinks" },
  { hi: "खंडेलवाल ज्वैलर्स", en: "Khandelwal Jewellers", tag: "Sona • Chandi • Hallmark" },
  { hi: "जय अम्बे जूस सेंटर", en: "Jai Ambe Juice Centre", tag: "Lassi • Shake • Juice" },
  { hi: "सोनी वीडियो लाइब्रेरी", en: "Soni Video Library", tag: "VCD • DVD on Rent" },
  { hi: "पटेल हार्डवेयर", en: "Patel Hardware", tag: "Paint • Sanitary • Tools" },
  { hi: "अजमेर फुटवियर", en: "Ajmer Footwear", tag: "Joota • Chappal • School Shoes" },
  { hi: "ओम ऑप्टिकल्स", en: "Om Opticals", tag: "Eye Testing • Chashma" },
  { hi: "शिव शक्ति किराना", en: "Shiv Shakti Kirana", tag: "Atta • Dal • Chawal" },
  { hi: "माँ भवानी मसाला भंडार", en: "Maa Bhavani Masala Bhandar", tag: "Pisai • Masale" },
  { hi: "मॉडर्न ड्राई क्लीनर्स", en: "Modern Dry Cleaners", tag: "Dry Clean • Press" },
  { hi: "आशा ब्यूटी पार्लर", en: "Asha Beauty Parlour", tag: "Ladies Only • Mehndi" },
  { hi: "राठौड़ इलेक्ट्रॉनिक्स", en: "Rathore Electronics", tag: "TV • VCD Player • Repairing" },
  { hi: "सिंधी नमकीन भंडार", en: "Sindhi Namkeen Bhandar", tag: "Bhujia • Papad • Achaar" },
  { hi: "गोपाल डेयरी", en: "Gopal Dairy", tag: "Doodh • Dahi • Paneer" },
  { hi: "विजय स्टेशनरी", en: "Vijay Stationery", tag: "Xerox • Lamination • Spiral" },
  { hi: "राजपूत टायर्स", en: "Rajput Tyres", tag: "Puncture • Tube • Tyre" },
  { hi: "हनुमान किराना स्टोर", en: "Hanuman Kirana Store", tag: "Sab Saman Uchit Daam" },
  { hi: "कमल वॉच कंपनी", en: "Kamal Watch Co.", tag: "Watch • Clock • Repairing" },
  { hi: "नेहा गारमेंट्स", en: "Neha Garments", tag: "Ready-made • Kids Wear" },
];

/** A painted wall ad for a look-alike brand of the period (slogans are invented). */
export type WallAd = {
  brand: string;
  line: string;
  /** Hindi line, painted smaller. */
  hi: string;
  bg: string;
  fg: string;
  accent: string;
};

export const WALL_ADS: WallAd[] = [
  { brand: "Thumbs Upp", line: "TOOFANI THANDA!", hi: "ठंडा ठंडा कूल कूल", bg: "#c8342b", fg: "#fbf3e3", accent: "#f2c53d" },
  { brand: "NOKIYA", line: "Har Haath Mein", hi: "मोबाइल फ़ोन", bg: "#1f4f8f", fg: "#fbf3e3", accent: "#9cc6ee" },
  { brand: "Fevicool", line: "PAKKA JOD!", hi: "टूटे नहीं, छूटे नहीं", bg: "#f2c53d", fg: "#1f3f7a", accent: "#c8342b" },
  { brand: "Boro Pluss", line: "Antiseptic Cream", hi: "हर मौसम में", bg: "#3e7d4c", fg: "#fbf3e3", accent: "#f2c53d" },
  { brand: "Hatch", line: "Network Har Jagah", hi: "मोबाइल सेवा", bg: "#f5efe3", fg: "#c2186b", accent: "#2b2622" },
  { brand: "Parley-J", line: "Biscuit", hi: "स्वाद भरे, शक्ति भरे", bg: "#f7d64a", fg: "#b8322a", accent: "#2b2622" },
  { brand: "Rasnaa", line: "Garmi Ka Dost", hi: "एक पैकेट, बत्तीस गिलास", bg: "#e8792b", fg: "#4b1f5e", accent: "#fbf3e3" },
  { brand: "Ajmer Coaching Classes", line: "IIT • PMT • 10+2", hi: "सफलता की गारंटी", bg: "#f5efe3", fg: "#1f3f7a", accent: "#c8342b" },
];

/** Films on the posters: look-alike titles (from the brief), with a poster colour scheme. */
export type Film = { title: string; top: string; bottom: string; ink: string };

export const FILMS: Film[] = [
  { title: "3 IDIOTZ", top: "#f4d03f", bottom: "#e67e22", ink: "#1b1b1b" },
  { title: "JAB WE MATE", top: "#f8c8d0", bottom: "#d84a6f", ink: "#fffaf0" },
  { title: "DHOOM DHAAM 2", top: "#2c3e50", bottom: "#c0392b", ink: "#f1c40f" },
  { title: "RANG DE BASANT", top: "#f39c12", bottom: "#8e44ad", ink: "#fffaf0" },
  { title: "ROCK ONN!!", top: "#1b1b1b", bottom: "#c0392b", ink: "#fdfefe" },
  { title: "JAANE TU YA JAANE MAIN", top: "#aed6f1", bottom: "#2874a6", ink: "#fffaf0" },
  { title: "GOLLMAAL", top: "#58d68d", bottom: "#f4d03f", ink: "#c0392b" },
  { title: "WWX SMACKDOWN", top: "#212f3d", bottom: "#7b241c", ink: "#f4d03f" },
];

/** The town's cinema, advertised on the posters. */
export const CINEMA = { en: "MAYUR TALKIES", hi: "मयूर टॉकीज़" };
