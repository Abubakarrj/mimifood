/* Tea knowledge: a glossary of tea cultivars
   (the plant varieties teas are made from), grouped by country. Given to the FAQ assistant, and
   Find Your Tea asks about the cultivars of the teas on sale: a tea names its cultivar with
   `cultivar: "<id>"` (js/data.js). For customers, the same guide is the Numeral post
   content/numeral/2026-10-what-is-a-tea-cultivar.md (one line each there; update it too). Add entries as new teas come in. */

const TEA_CULTIVARS: any[] = [
  {
    country: "China",
    entries: [
      { id: "ai-jiao", name: "Ai Jiao", native: "矮脚烏龍", about: "A Wuyi rock-tea (Yancha) “famous bush” named for its squat, short-legged growth and small round leaves. Usually processed away from florals, toward earthy, mineral and nutty depth." },
      { id: "ba-xian", name: "Ba Xian", native: "八仙", gloss: "Eight Immortals", about: "A Wuyi cultivar grown in the lower ecological gardens outside the main gorge. A gentle, low-temperature charcoal roast keeps its aromatics clean and floral." },
      { id: "da-bai-da-hao", name: "Da Bai & Da Hao", native: "大白 / 大毫", about: "The two large-leaf, silver-haired cultivars behind classic Fuding white tea. Their downy buds and high amino acids give Silver Needle its texture and White Peony its balance." },
      { id: "da-hong-pao", name: "Da Hong Pao", native: "大红袍", about: "Not a single cultivar: a style named for a few legendary mother bushes on Jiuxian Rock. Most Da Hong Pao today is a blend of several Wuyi cultivars made to echo the original." },
      { id: "da-shu-gu-shu", name: "Da Shu / Gu Shu", native: "大树 / 古树", gloss: "Big Tree / Old Tree", about: "A description of the tree, not a bred cultivar: large old Yunnan trees, often 70–100 years or more, of the region’s native broad-leaf tea. Older trees tend to give a deeper, more layered cup." },
      { id: "da-wu-ye", name: "Da Wu Ye", native: "大乌叶", gloss: "Big Dark Leaf", about: "A Lincang growers’ name for large-leaf trees with dark, thick, glossy leaves, a type within Yunnan’s large-leaf family. Known for a thick, sweet, full-bodied cup." },
      { id: "da-ye-zhong", name: "Da Ye Zhong", native: "大叶种", gloss: "Large-Leaf Variety", about: "Yunnan’s large-leaf tea (Camellia sinensis var. assamica), the raw material of nearly all puerh and Dian Hong. An umbrella for hundreds of local populations; its rich leaves give puerh structure and the ability to age." },
      { id: "dong-ting", name: "Dong Ting", native: "洞庭种", about: "The old seed-grown bush population of the Dongting hills on Taihu Lake, the traditional source of Bi Luo Chun. Its dense white hairs are a sign of sweetness and quality." },
      { id: "huang-guan-yin", name: "Huang Guan Yin", native: "黄观音", gloss: "Yellow Guan Yin", about: "A modern Fujian hybrid of Tie Guan Yin and Huang Dan. Prized for a high, lifting aroma, it’s often used in Wuyi blends for brightness." },
      { id: "huang-mei-gui", name: "Huang Mei Gui", native: "黄玫瑰", gloss: "Yellow Rose", about: "A modern Wuyi hybrid (its exact parents are debated) with a strong rose-like aroma over caramel and stone fruit." },
      { id: "jin-yao-shi", name: "Jin Yao Shi", native: "金钥匙", gloss: "Golden Key", about: "A rare Wuyi “famous bush” with about a century of history, long grown by only a few families in the gorge. Usually processed toward nutty, vegetal flavors." },
      { id: "longjing-43", name: "Longjing #43", native: "龙井43号", about: "A modern cultivar bred for Dragon Well: early budding, high yielding, with the flat, spear-shaped leaf the tea is known for." },
      { id: "qi-lan", name: "Qi Lan", native: "奇兰", about: "An Anxi cultivar also grown as Wuyi rock tea, where mineral terroir meets its natural orchid aroma. It takes a skilled roaster to keep both." },
      { id: "qiao-mu", name: "Qiao Mu", native: "乔木", gloss: "Arbor", about: "A growth form, not a cultivar: tea grown as a true tree with one tall trunk rather than a pruned bush. On a puerh, “wild arbor” points to tall, deep-rooted forest trees." },
      { id: "rou-gui", name: "Rou Gui", native: "肉桂", gloss: "Cassia", about: "Named for its cinnamon-like aroma, and one of the two pillars of modern Wuyi rock tea since wide planting from the 1980s. Bold, spicy and very expressive of where it grows." },
      { id: "rui-xiang", name: "Rui Xiang", native: "瑞香", gloss: "Auspicious Fragrance", about: "A modern Fujian cultivar descended from Huang Dan, with a rich, rising floral and fruit aroma. A favorite backbone for Da Hong Pao blends." },
      { id: "shui-jin-gui", name: "Shui Jin Gui", native: "水金龟", gloss: "Golden Turtle", about: "One of Wuyi’s Four Great Bushes, named for the shell-like pattern of its leaf veins. Grows best by running water; bold and fruit-layered." },
      { id: "shui-xian", name: "Shui Xian", native: "水仙", gloss: "Narcissus", about: "One of the most planted Wuyi cultivars, and one of the few often grown as old bushes. Old-tree Shui Xian develops mossy, orchid and woodsmoke depth." },
      { id: "tie-guan-yin", name: "Tie Guan Yin", native: "铁观音", gloss: "Iron Goddess of Mercy", about: "Anxi’s signature oolong cultivar, about 300 years old and a parent of several newer cultivars. It can be heavily roasted or kept fresh and green: two very different teas from one plant." },
      { id: "xiao-ye-zhong", name: "Xiao Ye Zhong", native: "小叶种", gloss: "Small-Leaf Variety", about: "Smaller- and medium-leaf trees found in a few historic puerh areas alongside the large-leaf trees. They give a fragrant, fine-textured cup with gentler bitterness." },
      { id: "xiao-zhong", name: "Xiao Zhong / Hua Xiang", native: "小种 / 花香", about: "The small-leaf native variety of Tongmu Guan, where Lapsang Souchong began. Naturally floral and hard to tame; usually made into black tea." },
      { id: "ye-sheng", name: "Ye Sheng", native: "野生", gloss: "Wild-Growing", about: "A growth type: trees that seeded and grew on their own, without cultivation. Older and more genetically varied than planted stock, with a more mineral cup." },
      { id: "zi-ya", name: "Zi Ya", native: "紫芽", gloss: "Purple Bud", about: "A purple-budded cultivar, colored by anthocyanins (the pigments in blueberries). It can be made into any kind of tea, from green to puerh." },
    ],
  },
  {
    country: "Korea",
    entries: [
      { id: "hadong", name: "Hadong", native: "하동", about: "The native seed-grown tea of Korea’s Jiri Mountains, the country’s oldest tea region, with records going back over a thousand years. Grown from seed, so each bush differs, which many say adds depth." },
    ],
  },
  {
    country: "Japan",
    entries: [
      { id: "asahi", name: "Asahi", native: "旭", about: "A historic Uji cultivar grown for tencha and matcha, with deep umami and a dark chocolate, peony-like fragrance. Rarer than Yabukita, but a regular in tencha competitions." },
      { id: "gokoh", name: "Gokoh", native: "ごこう", about: "An Uji cultivar bred for gyokuro and fine matcha: low bitterness and a thick, sweet body that shading brings out." },
      { id: "okumidori", name: "Okumidori", native: "おくみどり", about: "A late-budding cultivar from 1974, from Yabukita and a Shizuoka strain. Deep green, mild and rounded; often blended to calm brighter cultivars." },
      { id: "saemidori", name: "Saemidori", native: "さえみどり", about: "A Yabukita × Asatsuyu cross bred for vivid color and strong umami in sencha. Common in competition tea." },
      { id: "samidori", name: "Samidori", native: "さみどり", about: "An older Uji cultivar (not Saemidori) at the heart of traditional gyokuro and ceremonial matcha: balanced umami, very little bitterness." },
      { id: "sayama-kaori", name: "Sayama Kaori", native: "さやまかおり", about: "A cold-hardy cultivar from Saitama’s Sayama region, one of Japan’s northernmost. A rose-like floral note shows in both its green and black teas." },
      { id: "yabukita", name: "Yabukita", native: "やぶきた", about: "Japan’s most planted cultivar, registered in 1953. It still covers well over half of Japan’s tea fields, and is the benchmark every other Japanese cultivar is compared with." },
    ],
  },
  {
    country: "Taiwan",
    entries: [
      { id: "qing-xin", name: "Qing Xin", native: "青心烏龍", gloss: "Green Heart", about: "Taiwan’s heirloom oolong cultivar, the backbone of high mountain oolong, Dong Ding and Bao Zhong. Slow-growing and low-yielding, with more depth and aging potential." },
      { id: "sijichun", name: "Sijichun", native: "四季春", gloss: "Four Seasons Spring", about: "A 1980s hybrid bred to harvest year-round. A gentle bake brings out a milky, creamy cup, an easy way into Taiwanese oolong." },
      { id: "tie-guan-yin-taiwan", name: "Tie Guan Yin (Taiwan)", native: "鐵觀音", about: "The Anxi cultivar, grown in Taiwan for generations and roasted in a local style. Aged Taiwanese Tie Guan Yin becomes very different from its mainland cousin." },
      { id: "wu-yi-taiwan", name: "Wu Yi (Taiwan)", native: "武夷", about: "Wuyi cultivars brought to Taiwan in the late 1700s, many now old, untended vines with a character of their own after two centuries." },
    ],
  },
  {
    country: "India",
    entries: [
      { id: "av2", name: "AV2", gloss: "Ambari Vitro-2", about: "A Darjeeling clone propagated by tissue culture and known for intense muscatel in first-flush tea. Widely replanted for its consistency." },
      { id: "assam-jat", name: "Assam Jat", about: "Assam’s traditional seed-grown tea (var. assamica), rather than clonal cuttings. More variation bush to bush; found mostly in old or wild gardens." },
    ],
  },
  {
    country: "Sri Lanka",
    entries: [
      { id: "assamica-ceylon", name: "Camellia sinensis var. assamica", about: "The large-leaf type planted across Sri Lanka’s low- and mid-country gardens, behind the malty, full-bodied style of low-grown Ceylon black tea." },
    ],
  },
];

// Tea regions on the map in the cultivar guide (content/maps/tea-regions.svg): where each sits on
// the map in % (from scripts/build-maps.mjs) and the cultivars (ids above) grown there.
const TEA_REGIONS: any[] = [
  { id: "wuyi", name: "Wuyi Mountains", place: "Fujian", country: "China", x: 63.3, y: 47.7, cultivars: ["ai-jiao", "ba-xian", "da-hong-pao", "huang-mei-gui", "jin-yao-shi", "rou-gui", "rui-xiang", "shui-jin-gui", "shui-xian", "xiao-zhong"] },
  { id: "anxi", name: "Anxi", place: "Fujian", country: "China", x: 63.9, y: 53.5, cultivars: ["tie-guan-yin", "huang-guan-yin", "qi-lan"] },
  { id: "fuding", name: "Fuding", place: "Fujian", country: "China", x: 66.1, y: 48.6, cultivars: ["da-bai-da-hao"] },
  { id: "hangzhou", name: "Hangzhou", place: "Zhejiang", country: "China", x: 66.1, y: 42.1, cultivars: ["longjing-43"] },
  { id: "yunnan", name: "Yunnan", place: "Lincang and Xishuangbanna", country: "China", x: 43.3, y: 57.9, cultivars: ["da-ye-zhong", "da-wu-ye", "da-shu-gu-shu", "qiao-mu", "ye-sheng", "xiao-ye-zhong", "zi-ya"] },
  { id: "hadong", name: "Hadong", place: "Jiri Mountains", country: "Korea", x: 74.7, y: 30.9, cultivars: ["hadong"] },
  { id: "uji", name: "Uji", place: "Kyoto", country: "Japan", x: 83.9, y: 31.4, cultivars: ["asahi", "gokoh", "samidori"] },
  { id: "shizuoka", name: "Shizuoka", place: "Japan's largest tea region", country: "Japan", x: 86.8, y: 31.2, cultivars: ["yabukita", "okumidori"] },
  { id: "sayama", name: "Sayama", place: "Saitama", country: "Japan", x: 88.0, y: 29.1, cultivars: ["sayama-kaori"] },
  { id: "nantou", name: "Central Taiwan", place: "Nantou mountains", country: "Taiwan", x: 66.9, y: 55.9, cultivars: ["qing-xin", "sijichun"] },
  { id: "darjeeling", name: "Darjeeling", place: "West Bengal", country: "India", x: 29.8, y: 49.2, cultivars: ["av2"] },
  { id: "assam", name: "Assam", place: "Brahmaputra valley", country: "India", x: 35.1, y: 51.0, cultivars: ["assam-jat"] },
  { id: "sri-lanka", name: "Sri Lanka", place: "Low- and mid-country gardens", country: "Sri Lanka", x: 21.3, y: 90.2, cultivars: ["assamica-ceylon"] },
];
