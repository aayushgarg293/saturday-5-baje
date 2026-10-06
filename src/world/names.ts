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
  /** Decides the goods laid out in front of the shop (world/props/goods.ts). */
  trade: Trade;
  /** What's on its shelves, exactly (world/props/goods.ts shapes them, world/props/labels.ts prints them). */
  shelf: Shelf;
  /** Someone at work in it, instead of a keeper on a stool: the tailor at his machine (people/tailor.ts). */
  work?: "tailor";
};

/** Kinds of shop, for dressing them with goods. */
export type Trade = "kirana" | "sweets" | "cloth" | "electrical" | "cycle" | "general";

/** What a shop keeps on its shelves: each has its own shapes and products. */
export type Shelf =
  | "grocery" | "paan" | "masala" | "namkeen" | "dairy" | "sweets" | "juice"
  | "chemist" | "optical" | "photo" | "books" | "stationery" | "gifts" | "mobile"
  | "barber" | "beauty" | "bangles" | "utensils" | "tent" | "jewellery" | "video"
  | "hardware" | "footwear" | "watch" | "electrical" | "electronics" | "cycle" | "autoParts" | "cloth";

/**
 * How many of the names below are the bazaar's (the first ones): its shops
 * are named from these, in a fixed shuffled order. Names added later, for the
 * town's other roads, go after them, so the bazaar's shops keep their names.
 */
export const BAZAAR_SHOPS = 36;
/** The chowk's shops' names: the ten after the bazaar's. */
export const CHOWK_SHOPS = { from: 36, count: 10 };

export const SHOP_NAMES: ShopName[] = [
  { hi: "शर्मा जनरल स्टोर", en: "Sharma General Store", tag: "Kirana • Cold Drinks • Dry Fruits", trade: "kirana", shelf: "grocery" },
  { hi: "गुप्ता मिष्ठान भंडार", en: "Gupta Mishthan Bhandar", tag: "Kachori • Samosa • Jalebi", trade: "sweets", shelf: "sweets" },
  { hi: "जनता साइकिल स्टोर", en: "Janta Cycle Store", tag: "Repairing • Puncture • Parts", trade: "cycle", shelf: "cycle" },
  { hi: "बॉम्बे हेयर कटिंग सैलून", en: "Bombay Hair Cutting Saloon", tag: "Hair Cut • Shave • Massage", trade: "general", shelf: "barber" },
  { hi: "रॉयल टेलर्स", en: "Royal Tailors", tag: "Gents & Ladies • Suit Specialist", trade: "cloth", shelf: "cloth", work: "tailor" },
  { hi: "कृष्णा फोटो स्टूडियो", en: "Krishna Photo Studio", tag: "Passport Photo • Colour Lab", trade: "general", shelf: "photo" },
  { hi: "लक्ष्मी चूड़ी भंडार", en: "Laxmi Choodi Bhandar", tag: "Bangles • Bindi • Cosmetics", trade: "general", shelf: "bangles" },
  { hi: "जैन मेडिकल स्टोर", en: "Jain Medical Store", tag: "Chemist & Druggist", trade: "general", shelf: "chemist" },
  { hi: "अग्रवाल क्लॉथ हाउस", en: "Agarwal Cloth House", tag: "Suit • Saree • Cut Piece", trade: "cloth", shelf: "cloth" },
  { hi: "महावीर इलेक्ट्रिकल्स", en: "Mahaveer Electricals", tag: "Fan • Cooler • Wiring", trade: "electrical", shelf: "electrical" },
  { hi: "श्री बालाजी बर्तन भंडार", en: "Shri Balaji Bartan Bhandar", tag: "Steel • Brass • Pressure Cooker", trade: "general", shelf: "utensils" },
  { hi: "न्यू फैंसी स्टोर", en: "New Fancy Store", tag: "Gift • Toys • Stationery", trade: "general", shelf: "gifts" },
  { hi: "अजमेर स्वीट्स", en: "Ajmer Sweets", tag: "Sohan Halwa • Ghewar • Namkeen", trade: "sweets", shelf: "sweets" },
  { hi: "सरस्वती बुक डिपो", en: "Saraswati Book Depot", tag: "Guides • Copies • Pen", trade: "general", shelf: "books" },
  { hi: "गणेश मोबाइल पॉइंट", en: "Ganesh Mobile Point", tag: "Recharge • Repairing • Cover", trade: "general", shelf: "mobile" },
  { hi: "चौधरी ऑटो पार्ट्स", en: "Chaudhary Auto Parts", tag: "Scooter • Motorcycle", trade: "cycle", shelf: "autoParts" },
  { hi: "भारत टेंट हाउस", en: "Bharat Tent House", tag: "Shaadi • Party • Jagran", trade: "general", shelf: "tent" },
  { hi: "मोहन पान भंडार", en: "Mohan Paan Bhandar", tag: "Meetha Paan • Cold Drinks", trade: "kirana", shelf: "paan" },
  { hi: "खंडेलवाल ज्वैलर्स", en: "Khandelwal Jewellers", tag: "Sona • Chandi • Hallmark", trade: "general", shelf: "jewellery" },
  { hi: "जय अम्बे जूस सेंटर", en: "Jai Ambe Juice Centre", tag: "Lassi • Shake • Juice", trade: "sweets", shelf: "juice" },
  { hi: "सोनी वीडियो लाइब्रेरी", en: "Soni Video Library", tag: "VCD • DVD on Rent", trade: "general", shelf: "video" },
  { hi: "पटेल हार्डवेयर", en: "Patel Hardware", tag: "Paint • Sanitary • Tools", trade: "general", shelf: "hardware" },
  { hi: "अजमेर फुटवियर", en: "Ajmer Footwear", tag: "Joota • Chappal • School Shoes", trade: "general", shelf: "footwear" },
  { hi: "ओम ऑप्टिकल्स", en: "Om Opticals", tag: "Eye Testing • Chashma", trade: "general", shelf: "optical" },
  { hi: "शिव शक्ति किराना", en: "Shiv Shakti Kirana", tag: "Atta • Dal • Chawal", trade: "kirana", shelf: "grocery" },
  { hi: "माँ भवानी मसाला भंडार", en: "Maa Bhavani Masala Bhandar", tag: "Pisai • Masale", trade: "kirana", shelf: "masala" },
  { hi: "मॉडर्न ड्राई क्लीनर्स", en: "Modern Dry Cleaners", tag: "Dry Clean • Press", trade: "cloth", shelf: "cloth" },
  { hi: "आशा ब्यूटी पार्लर", en: "Asha Beauty Parlour", tag: "Ladies Only • Mehndi", trade: "general", shelf: "beauty" },
  { hi: "राठौड़ इलेक्ट्रॉनिक्स", en: "Rathore Electronics", tag: "TV • VCD Player • Repairing", trade: "electrical", shelf: "electronics" },
  { hi: "सिंधी नमकीन भंडार", en: "Sindhi Namkeen Bhandar", tag: "Bhujia • Papad • Achaar", trade: "kirana", shelf: "namkeen" },
  { hi: "गोपाल डेयरी", en: "Gopal Dairy", tag: "Doodh • Dahi • Paneer", trade: "kirana", shelf: "dairy" },
  { hi: "विजय स्टेशनरी", en: "Vijay Stationery", tag: "Xerox • Lamination • Spiral", trade: "general", shelf: "stationery" },
  { hi: "राजपूत टायर्स", en: "Rajput Tyres", tag: "Puncture • Tube • Tyre", trade: "cycle", shelf: "cycle" },
  { hi: "हनुमान किराना स्टोर", en: "Hanuman Kirana Store", tag: "Sab Saman Uchit Daam", trade: "kirana", shelf: "grocery" },
  { hi: "कमल वॉच कंपनी", en: "Kamal Watch Co.", tag: "Watch • Clock • Repairing", trade: "general", shelf: "watch" },
  { hi: "नेहा गारमेंट्स", en: "Neha Garments", tag: "Ready-made • Kids Wear", trade: "cloth", shelf: "cloth" },
  // --- round the chowk (world/town.ts): after the bazaar's, so its shops keep their names ---
  { hi: "घंटाघर मिष्ठान भंडार", en: "Ghanta Ghar Mishthan Bhandar", tag: "Kachori • Ghewar • Lassi", trade: "sweets", shelf: "sweets" },
  { hi: "राजस्थान हैंडलूम", en: "Rajasthan Handloom", tag: "Bandhej • Leheriya • Razai", trade: "cloth", shelf: "cloth" },
  { hi: "अजमेर घड़ी साज़", en: "Ajmer Ghadi Saaz", tag: "Watch Repairing • Battery", trade: "general", shelf: "watch" },
  { hi: "न्यू इंडिया बुक स्टॉल", en: "New India Book Stall", tag: "Akhbar • Magazine • Novel", trade: "general", shelf: "books" },
  { hi: "सेठी ड्राई फ्रूट्स", en: "Sethi Dry Fruits", tag: "Kaju • Badam • Pista", trade: "kirana", shelf: "grocery" },
  { hi: "प्रकाश फोटो कॉपी", en: "Prakash Photo Copy", tag: "Xerox • Fax • Lamination", trade: "general", shelf: "stationery" },
  { hi: "मारवाड़ जूती घर", en: "Marwar Jooti Ghar", tag: "Mojdi • Jooti • Chappal", trade: "general", shelf: "footwear" },
  { hi: "श्याम रेडियो सर्विस", en: "Shyam Radio Service", tag: "Radio • Tape • TV Repairing", trade: "electrical", shelf: "electronics" },
  { hi: "होटल अन्नपूर्णा", en: "Hotel Annapurna", tag: "Shudh Shakahari Bhojnalaya", trade: "sweets", shelf: "sweets" },
  { hi: "गुरु कृपा किराना", en: "Guru Kripa Kirana", tag: "Sab Saman Uchit Daam", trade: "kirana", shelf: "grocery" },
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

/**
 * The posters pasted on the walls: films (look-alike titles, from the brief),
 * and the other posters every wall had: the circus in town, a jagran night,
 * tuition admissions, a Diwali sale. `sub` and `footer` replace a film's
 * "आज ही देखें" and "NOW SHOWING" lines.
 */
export type Film = { title: string; top: string; bottom: string; ink: string; sub?: string; footer?: string };

export const FILMS: Film[] = [
  { title: "3 IDIOTZ", top: "#f4d03f", bottom: "#e67e22", ink: "#1b1b1b" },
  { title: "JAB WE MATE", top: "#f8c8d0", bottom: "#d84a6f", ink: "#fffaf0" },
  { title: "DHOOM DHAAM 2", top: "#2c3e50", bottom: "#c0392b", ink: "#f1c40f" },
  { title: "RANG DE BASANT", top: "#f39c12", bottom: "#8e44ad", ink: "#fffaf0" },
  { title: "ROCK ONN!!", top: "#1b1b1b", bottom: "#c0392b", ink: "#fdfefe" },
  { title: "JAANE TU YA JAANE MAIN", top: "#aed6f1", bottom: "#2874a6", ink: "#fffaf0" },
  { title: "GOLLMAAL", top: "#58d68d", bottom: "#f4d03f", ink: "#c0392b" },
  { title: "WWX SMACKDOWN", top: "#212f3d", bottom: "#7b241c", ink: "#f4d03f" },
  // not films
  { title: "THE GREAT RAMBU CIRCUS", top: "#f4d03f", bottom: "#c0392b", ink: "#1b1b1b", sub: "शेर • हाथी • जोकर • झूला", footer: "MELA GROUND • 3 SHOWS DAILY" },
  { title: "MATA KA JAGRAN", top: "#f5b041", bottom: "#b03a2e", ink: "#fffaf0", sub: "विशाल भगवती जागरण • सारी रात", footer: "SATURDAY NIGHT • GANDHI CHOWK" },
  { title: "ADMISSION OPEN", top: "#fdfefe", bottom: "#aed6f1", ink: "#1f3f7a", sub: "कक्षा 6 से 12 • गणित • विज्ञान", footer: "SHARMA TUTORIALS • ☎ 2451190" },
  { title: "DIWALI DHAMAKA SALE", top: "#f7dc6f", bottom: "#e74c3c", ink: "#4a235a", sub: "हर माल पर 50% छूट", footer: "NEW FANCY STORE • MAIN BAZAR" },
];

/** The town's cinema, advertised on the posters. */
export const CINEMA = { en: "MAYUR TALKIES", hi: "मयूर टॉकीज़" };

/**
 * Political posters pasted on the electricity poles: municipal election
 * candidates, a college union election, a local leader's birthday, a welcome
 * for a visiting minister. All made up: independent candidates (no real
 * party), invented election symbols, common made-up names.
 *
 *   `kind`     which layout the painter uses
 *   `top`      the band across the top
 *   `name`     the big name under the portrait
 *   `role`     what they're standing for, or who they are
 *   `line`     the appeal at the bottom
 *   `symbol`   the election symbol drawn beside the portrait, and its name
 *   `colours`  paper, main ink, second ink
 */
export type PolePoster = {
  kind: "vote" | "student" | "birthday" | "welcome";
  top: string;
  name: string;
  role: string;
  line: string;
  symbol?: { draw: "umbrella" | "pot" | "cot"; name: string };
  colours: [string, string, string];
};

export const POLE_POSTERS: PolePoster[] = [
  {
    kind: "vote", top: "नगर पालिका चुनाव 2006", name: "रमेश चंद सोनी", role: "वार्ड नं. 14 से निर्दलीय प्रत्याशी",
    line: "को भारी मतों से विजयी बनाएँ", symbol: { draw: "umbrella", name: "छाता" }, colours: ["#f4c542", "#1f4f8f", "#c0392b"],
  },
  {
    kind: "vote", top: "नगर पालिका चुनाव 2006", name: "हाजी अब्दुल रशीद", role: "वार्ड नं. 9 से निर्दलीय प्रत्याशी",
    line: "आपका अपना, आपके बीच", symbol: { draw: "pot", name: "मटका" }, colours: ["#2f7d45", "#fbf6ea", "#f4c542"],
  },
  {
    kind: "student", top: "छात्रसंघ चुनाव 2007", name: "सुनील चौधरी", role: "अध्यक्ष पद हेतु",
    line: "क्रमांक 3 पर मोहर लगाएँ", symbol: { draw: "cot", name: "चारपाई" }, colours: ["#fbf6ea", "#c0392b", "#1f1a17"],
  },
  {
    kind: "birthday", top: "जन्मदिन की हार्दिक शुभकामनाएँ", name: "विक्रम सिंह राठौड़", role: "युवा नेता",
    line: "शुभेच्छु: मोहल्ला युवा मंच", colours: ["#e07b2e", "#fbf6ea", "#3a1f10"],
  },
  {
    kind: "welcome", top: "हार्दिक स्वागत एवं अभिनंदन", name: "माननीय मंत्री जी", role: "का नगर आगमन पर",
    line: "निवेदक: व्यापार मंडल", colours: ["#b8352c", "#f7d64a", "#fbf4e4"],
  },
];
