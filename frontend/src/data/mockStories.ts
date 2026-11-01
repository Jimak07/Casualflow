import { StoryPitch, LensPreset } from "@/types";

export const DEFAULT_PRESETS: LensPreset[] = [
  {
    id: "all",
    label: "All Auto-Connected Stories",
    iconName: "Sparkles",
  },
  {
    id: "ai-finance",
    label: "AI × Financial Markets",
    iconName: "TrendingUp",
    queryFilter: "AI × Financial Markets",
  },
  {
    id: "geopolitics-supply",
    label: "Geopolitics & Supply Chains",
    iconName: "Globe",
    queryFilter: "Geopolitics & Supply Chains",
  },
  {
    id: "cost-of-living",
    label: "Cost of Living & Raw Materials",
    iconName: "ShoppingBag",
    queryFilter: "Cost of Living & Raw Materials",
  },
];

export const MOCK_STORIES: StoryPitch[] = [
  {
    id: "ai-telecom-capex",
    title: "The $600B Silicon Subprime: Why AI CapEx May Echo the 2006 Telecom Crash",
    subtitle: "Hyperscalers are pouring $230B/yr into data centers with under 15% monetization. The 2001 dark fiber crash proved building the tracks before the train arrives leaves a massive bill for someone else.",
    category: "AI × Financial Markets",
    estimatedRuntime: "8 min 45 sec",
    wordCount: 1320,
    targetFormat: "YouTube Deep Dive / Documentary Essay",
    date: "Updated 42m ago",
    impactScore: 96,
    sourceCatalyst: {
      outlet: "Bloomberg Terminal / Tech Earnings",
      timeAgo: "2 hours ago",
      headline: "Big Tech Hyperscaler Annual CapEx Run-Rate Hits Record $235 Billion Amid H100 Cluster Expansion",
    },
    nodes: {
      macroTrigger: {
        title: "Hyperscaler CapEx Paradox ($235B Run-Rate)",
        date: "Current Cycle (2024–2026)",
        description:
          "Microsoft, Alphabet, Meta, and Amazon report historic infrastructure expenditures on Nvidia GPUs and specialized high-voltage facilities. Yet corporate software ROI and enterprise generative AI revenue generation remains below $35B globally.",
        metricTag: "+68% YoY Hardware CapEx",
        source: "Q3 SEC 10-Q Filings",
      },
      historicalParallel: {
        title: "The 1999–2001 Dark Fiber & 2006 CapEx Hangover",
        period: "1999–2006 (20-Year Historical Echo)",
        description:
          "Telecommunications giants (Global Crossing, WorldCom, 360networks) spent $90B laying 80 million miles of transatlantic fiber optic cable. When capacity outran demand by 10x, 95% of cables sat 'dark' and unlit for nearly a decade until video streaming matured.",
        similarityScore: "89% Structural Match",
        lesson: "Infrastructure overbuild subsidizes the next generation of applications, but wipes out current equity holders.",
      },
      humanImpact: {
        title: "The Kitchen Table Electric Bill Surcharge",
        affectedGroup: "US Suburban & European Households",
        description:
          "Regional utility operators in Virginia, Ohio, and Ireland are requesting 14% to 22% grid rate adjustments. Residential electricity consumers are subsidizing 500MW substation buildouts designed solely to prevent AI server clusters from browning out local townships.",
        dollarOrPriceMetric: "+$38.50/month Average Power Bill",
        actionableTakeaway: "Watch public utility commission rate filings in major data center corridors for immediate household budgeting impact.",
      },
    },
    script: {
      coldOpen: {
        title: "COLD OPEN: The Ghost Cities of Silicon",
        timestamp: "0:00 – 1:15",
        visualCue:
          "[CAPCUT CUES]\n• 0:00-0:10: Slow drone shot pushing into a glowing, monolithic server facility in Loudoun County, Virginia at dusk.\n• Text overlay (JetBrains Mono): 'LOUDOUN COUNTY, VA // 70% OF GLOBAL INTERNET TRAFFIC'.\n• Audio SFX: Low industrial transformer hum, crescendoing into a sudden tape-rewind drop.\n• 0:15-0:30: Fast rhythmic match cuts: Nvidia H100 server rack LED pulses → 1999 fiber optic spool reels spinning → an electric utility bill landing on a wooden kitchen table.\n• Tone: Unsettling, investigative, cinematic.",
        narration:
          "Right now, in the cornfields of Northern Virginia and the farmland of Ohio, four private corporations are spending more money on concrete, copper, and silicon than the United States government spent to build the interstate highway system.\n\nOver two hundred billion dollars a year. That is four hundred and forty thousand dollars every single minute. The promise? That artificial general intelligence will reinvent every job, cure diseases, and generate trillions in economic surplus.\n\nThere is only one uncomfortable problem: almost nobody is paying for it yet. And if this movie feels familiar, it is because we watched the exact same script play out twenty-five years ago—and the ending will arrive on your monthly utility bill.",
      },
      actI: {
        title: "ACT I: The Infinite Compute Illusion",
        timestamp: "1:15 – 3:30",
        visualCue:
          "[CAPCUT CUES]\n• 1:15-1:45: Interactive stock chart breakdown showing CapEx vs Enterprise GenAI software revenue (huge divergent jaws curve).\n• Split-screen B-roll: CEO keynote speeches promising infinite growth vs enterprise CFOs quietly pausing ChatGPT enterprise seats.\n• Sound design: Subtle ticking clock clocking under narration; digital glitch transition at 2:45.",
        narration:
          "To understand the scale of what is happening, you have to look past the stock market headlines and examine the balance sheets.\n\nIn financial economics, capital expenditure—or CapEx—is money you invest today to generate revenue tomorrow. If a factory buys a new million-dollar stamping machine, they calculate exactly how many car doors it stamps per hour. But in the current AI frenzy, hyperscalers are depreciating silicon over four to five years, even as new chips arrive every twelve months.\n\nBy mid-2026, the tech sector's compute depreciation expense will exceed the total free cash flow of almost every Fortune 500 company combined. It is a game of high-stakes musical chairs where nobody dares to stop buying, because whoever stops first looks like they have already lost.",
      },
      actII: {
        title: "ACT II: The Ghosts of Dark Fiber (1999–2006)",
        timestamp: "3:30 – 6:00",
        visualCue:
          "[CAPCUT CUES]\n• 3:30-4:00: Archival grain filter. Authentic 1999 CNBC broadcast footage: 'The Internet will require infinite bandwidth!'.\n• Infographic map: Animated transatlantic fiber-optic cable lines lighting up beneath the ocean, then fading out into deep blue darkness.\n• Lower-third title card: 'PARALLEL 01: GLOBAL CROSSING & WORLDCOM COLLAPSE'.\n• Sound design: Vintage dial-up tone warping into modern synthesizer drone.",
        narration:
          "Rewind the clock to 1999. Wall Street was caught in the grip of what they called the 'Photon Age'. Analysts swore that internet traffic was doubling every ninety days. Telecom executives raised tens of billions in junk bonds to lay millions of miles of optical glass beneath city streets and across the Atlantic seabed.\n\nThe logic sounded unassailable: internet traffic was real, computers were growing, civilization needed connectivity. But they built thirty years of capacity in thirty-six months. By 2002, ninety-five percent of those cables sat cold, dark, and unlit. The companies went bankrupt. Equity wiped out.\n\nYet here is the historical paradox: that overbuilt dark fiber was not useless. Five years later, in 2007, it became the cheap foundation that allowed Netflix, YouTube, and cloud computing to exist. The infrastructure was right; the timeline was catastrophic.",
      },
      actIII: {
        title: "ACT III: What Happens to Your Electricity Bill",
        timestamp: "6:00 – 8:45",
        visualCue:
          "[CAPCUT CUES]\n• 6:00-6:30: Intimate close-up: A family grocery receipt and monthly electric bill side-by-side on a desk.\n• 3D Motion graphic: Exploded diagram of a residential power grid showing energy siphon divert to a 500MW data center campus.\n• Fast punchy recap cards: Macro Trigger → 2001 Echo → What to do.\n• Outro music: Warm, resolving acoustic guitar over final title card.",
        narration:
          "So how does a billion-dollar silicon war between Silicon Valley titans affect someone who has never touched a chatbot?\n\nIt lives in the copper wires running into your house. A modern AI training cluster consumes as much instantaneous electric power as a city of two hundred thousand people. Power utilities cannot conjure that electricity out of thin air. They have to build new substations, run new high-tension transmission corridors, and keep fossil fuel peaking plants online.\n\nAnd under regulated utility laws in most Western democracies, infrastructure costs are passed straight along to retail ratepayers. In Northern Virginia, residential grid surcharges have already climbed double digits. The titans get the equity upside; the neighborhood pays the electricity surcharge.\n\nHistory does not repeat itself verbatim, but as the old saying goes, it rhymes. And this time, the echo is plugged straight into your wall.",
      },
    },
  },
  {
    id: "fertilizer-red-sea-bread",
    title: "The Fertilizer Trap: How Maritime Chokepoints Are Quietly Inflating Tomorrow's Bread",
    subtitle: "When container ships take 14 extra days around the Cape of Good Hope, synthetic nitrogen fertilizers get delayed. In 2008, a 40-day supply shock triggered food crises across 30 nations.",
    category: "Cost of Living & Raw Materials",
    estimatedRuntime: "6 min 15 sec",
    wordCount: 940,
    targetFormat: "Documentary Short / Macro Explainer",
    date: "Updated 1h ago",
    impactScore: 92,
    sourceCatalyst: {
      outlet: "Lloyd's List & FAO Global Price Index",
      timeAgo: "4 hours ago",
      headline: "Suez Container Transit Drops 64%; Nitrogen Ammonia Shippers Reroute Across Southern Africa",
    },
    nodes: {
      macroTrigger: {
        title: "Bab-el-Mandeb & Suez Maritime Bottleneck",
        date: "Current Macro Catalyst",
        description:
          "Commercial freight traffic through the southern Red Sea corridor remains crippled. Bulk agricultural chemicals and ammonia tankers are forced into a 14-day detour around Africa's southern tip, doubling bunker fuel burns.",
        metricTag: "+240% Freight War Risk Premium",
        source: "International Maritime Bureau",
      },
      historicalParallel: {
        title: "The 2008 Fertilizer Shock & Global Ag Crisis",
        period: "2007–2008 (18-Year Historical Echo)",
        description:
          "When natural gas feedstocks and maritime freight disrupted global urea and DAP deliveries in late 2007, global crop yields plummeted 8% in the following spring harvest. Within six months, staple bread prices doubled worldwide.",
        similarityScore: "84% Transmission Elasticity",
        lesson: "Agricultural price shocks lag maritime disruptions by exactly two harvest cycles (6–9 months).",
      },
      humanImpact: {
        title: "Supermarket Bakery Price Escalation",
        affectedGroup: "Working-Class Grocery Shoppers",
        description:
          "Commercial baking conglomerates and pasta producers face delayed chemical input costs that roll into spring wholesale grain contracts. Consumers will see a $0.90 to $1.35 jump in pantry staples.",
        dollarOrPriceMetric: "+$1.15 per Loaf & Pasta Box",
        actionableTakeaway: "Pantry hedging: Staples and grain goods will face their steepest retail markup by early Q4.",
      },
    },
    script: {
      coldOpen: {
        title: "COLD OPEN: The 14-Day Detour You Taste in Bread",
        timestamp: "0:00 – 1:00",
        visualCue:
          "[CAPCUT CUES]\n• 0:00-0:15: Satellite tracking map showing hundreds of cargo ships curving around the tip of South Africa in Cape Town.\n• Text overlay: 'THE 4,000 MILE DETOUR'.\n• Audio SFX: Heavy ship horn, ambient waves, supermarket register beep.\n• Match cut: Giant industrial ammonia storage tank → A golden loaf of sandwich bread sliced on a kitchen cutting board.",
        narration:
          "Four thousand miles away, in the rough seas off the coast of South Africa, a rusty chemical tanker is burning forty tons of bunker fuel every twenty-four hours.\n\nIt is carrying synthetic anhydrous ammonia. In about eight months, that ammonia will become nitrogen fertilizer in an Iowa soil bed. In twelve months, that soil will produce durum wheat. And in fourteen months, you will stand in aisle four of your local grocery store, wondering why a simple box of pasta costs four dollars and fifty cents.\n\nWelcome to the invisible machinery of global supply chains—where a maritime standoff in the Middle East decides the price of your breakfast cereal.",
      },
      actI: {
        title: "ACT I: The Cape of Good Hope Detour",
        timestamp: "1:00 – 2:30",
        visualCue:
          "[CAPCUT CUES]\n• Animated nautical route comparison: Red Sea shortcut (12 days) vs Cape detour (26 days).\n• Red financial ticker running at bottom: 'DIESEL SURCHARGE +34% // MARITIME INSURANCE +220%'.",
        narration:
          "For more than a century, the Suez Canal was humanity's great geographic hack. It turned a hazardous month-long journey around the African continent into an afternoon canal cruise.\n\nWhen security risks shut down that shortcut, maritime shipping did not stop. It just took the long way home. But ships are not train cars; you cannot simply dispatch another locomotive. When every vessel on Earth takes two extra weeks to complete its route, the effective capacity of the global merchant fleet drops overnight.",
      },
      actII: {
        title: "ACT II: The Chemistry of the 2008 Food Shock",
        timestamp: "2:30 – 4:30",
        visualCue:
          "[CAPCUT CUES]\n• 2008 News reels: Commodity exchange trading floor chaos, wheat charts spiking vertically.\n• Infographic: 1 bushel of wheat = energy breakdown (50% natural gas & nitrogen inputs).",
        narration:
          "Most people think food prices are about rain, drought, and sunshine. In the modern world, food is primarily fossil fuels and logistics disguised as calories.\n\nLook at what occurred in 2007 and 2008. When shipping rates and energy feedstocks spiked, fertilizer plants in Eastern Europe and North Africa halted export contracts. Farmers in the Midwest and South America responded by rationing fertilizer application. When harvest time arrived, yields were down nine percent.\n\nNine percent sounds manageable until you realize global food demand has zero elasticity. People cannot choose to eat half as much this month. So commodity markets panicked, and food prices doubled in ninety days.",
      },
      actIII: {
        title: "ACT III: The Lagged Receipt",
        timestamp: "4:30 – 6:15",
        visualCue:
          "[CAPCUT CUES]\n• Macro footage: Supermarket shelves, barcode scanners.\n• Bulleted summary infographic: 'TIMELINE: Month 1: Suez Delay → Month 6: Planting Cuts → Month 12: Retail Grocery Shock'.\n• Soft cinematic piano crescendo.",
        narration:
          "The critical lesson is the clock. Wall Street reacts to news in milliseconds. The real economy operates on the rhythm of seeds, soil, and container ships.\n\nThe shipping disruption that made headlines yesterday will not hit retail store shelves next Tuesday. It will simmer through commercial baker hedging desks for six months before landing gently, invisibly, on your grocery receipt.\n\nWhen you see that receipt climb, remember: you are not paying for the wheat. You are paying for the diesel that carried the fertilizer around the Cape of Good Hope.",
      },
    },
  },
  {
    id: "copper-grid-chokepoint",
    title: "The Copper Mirage: Why Green Energy & AI Transformers Will Collide in 2027",
    subtitle: "Every AI server needs a transformer; every EV needs 4x the wiring of a gas car. With copper mine lead times at 16 years, we are heading toward a 1970s-style physical resource squeeze.",
    category: "Geopolitics & Supply Chains",
    estimatedRuntime: "10 min 20 sec",
    wordCount: 1540,
    targetFormat: "Long-Form Investigative Video",
    date: "Updated 3h ago",
    impactScore: 94,
    sourceCatalyst: {
      outlet: "Financial Times / LME Inventories",
      timeAgo: "6 hours ago",
      headline: "London Metal Exchange Copper Stocks Fall to Critical Thresholds as Chilean Mining Water Curbs Expand",
    },
    nodes: {
      macroTrigger: {
        title: "LME Copper Warehouse Depletion",
        date: "2024–2026 Mineral Supply Trend",
        description:
          "Global refined copper inventories at major international exchanges drop to less than 4 days of global consumption. Simultaneously, permitting delays in Chile and Panama have stalled 1.2M metric tons of replacement capacity.",
        metricTag: "Inventories at 4-Day Minimum",
        source: "London Metal Exchange Data",
      },
      historicalParallel: {
        title: "The 1973 Industrial Squeeze & The 1912 Electrification Bottleneck",
        period: "1973 & 1912 (Multi-Decade Pattern)",
        description:
          "During the post-WWI industrial boom and 1973 commodity shocks, primary conductive materials became diplomatic weapons. Secondary manufacturing shrank 32% until aluminum substitution standards were retrofitted at immense expense.",
        similarityScore: "87% Physical Constraint Echo",
        lesson: "You can write code and print digital currency overnight, but opening an open-pit copper mine takes 16 years.",
      },
      humanImpact: {
        title: "Home AC & EV Rewiring Cost Explosion",
        affectedGroup: "Homeowners & Commuters",
        description:
          "Electricians face 80% higher spool prices for 6-gauge and 10-gauge home wiring. Replacing a blown central AC unit or installing a 240V Level 2 EV charging circuit now costs $1,200 to $1,800 more in pure material overhead.",
        dollarOrPriceMetric: "+$1,400 Average Home Electrical Quote",
        actionableTakeaway: "Upgrade home heavy wiring and HVAC systems before 2026 contract repricing cycles hit trade contractors.",
      },
    },
    script: {
      coldOpen: {
        title: "COLD OPEN: The Metal That Stops the Future",
        timestamp: "0:00 – 1:30",
        visualCue:
          "[CAPCUT CUES]\n• 0:00-0:20: Extreme macro lens shot of molten copper being drawn into thick, glowing red electrical wire in a foundry.\n• Audio SFX: Heavy hydraulic press, sparking metal, bass drop.\n• 0:20-0:40: Quick split: Sleek futuristic AI humanoid robot on left vs gigantic, diesel-belching 400-ton haul truck in the Atacama Desert on right.\n• Text: 'THE PHYSICAL LIMIT OF DIGITAL EXPANSION'.",
        narration:
          "Silicon Valley believes the future is written in software code.\n\nThey tell us artificial intelligence will optimize our logistics, design new drugs, and accelerate the clean energy transition. But there is a dirty secret buried deep inside every electric vehicle, every wind turbine, and every AI data center cluster.\n\nNone of it works without element twenty-nine on the periodic table: copper. And right now, humanity is running headfirst into the hard physical reality of geology.",
      },
      actI: {
        title: "ACT I: The 16-Year Mine Problem",
        timestamp: "1:30 – 4:00",
        visualCue:
          "[CAPCUT CUES]\n• Drone flyover: Open pit mine in Escondida, Chile, stretching for miles.\n• Timeline graphic: 'Exploration (Year 1) → Environmental Permitting (Year 7) → Construction (Year 12) → First Ore (Year 16)'.",
        narration:
          "Consider this mathematical reality: an internal combustion engine car uses about twenty kilograms of copper. An electric vehicle uses eighty.\n\nA single high-voltage transformer powering an AI server cluster uses forty metric tons of ultra-pure conductive copper windings. If you add up the stated targets of every Western government for electric vehicles, renewable wind farms, and AI data centers, the world needs more copper in the next twenty-five years than humanity has mined in all of recorded history combined.\n\nAnd how long does it take to discover, permit, and dig a new copper mine? An average of sixteen years.",
      },
      actII: {
        title: "ACT II: The 1973 Industrial Bottleneck",
        timestamp: "4:00 – 7:00",
        visualCue:
          "[CAPCUT CUES]\n• Black and white archival: 1970s industrial plants, commodity brokers waving slips of paper.\n• Side-by-side data chart: Price of copper vs industrial production output index during 1973-1975 stagflation.",
        narration:
          "Whenever a civilization attempts to rebuild its primary energy infrastructure, it hits this exact bottleneck. In 1912, as the world moved from gas lamps to electric lighting, copper prices skyrocketed so violently that manufacturers tried replacing it with iron, causing thousands of electrical fires.\n\nIn 1973, when supply chains cracked, secondary manufacturers found that their factories were idle not because they lacked workers or customers, but because they could not buy the simple brass connectors and conductive cables required to assemble their machinery.",
      },
      actIII: {
        title: "ACT III: Your Local Electrician's Invoice",
        timestamp: "7:00 – 10:20",
        visualCue:
          "[CAPCUT CUES]\n• Footage: An electrician rolling out heavy Romex copper wire inside a suburban home renovation.\n• Invoice graphic highlight: 'Raw materials: $2,850 (Up from $1,400 in 2022)'.\n• Closing summary card with actionable advice for homeowners.",
        narration:
          "If you want to know where this story ends, don't look at the London Metal Exchange. Look at the back of an electrician's work van in your driveway.\n\nNext year, if your central air conditioner compressor burns out during a July heatwave, the replacement quote won't just be high because of labor. It will be high because the heavy copper tubing and high-torque motor windings inside that unit are competing directly against a hyperscale data center in Texas.\n\nWe wanted the digital cloud. But the cloud has to be anchored into the dirt by forty million tons of red metal. And the bill is coming due.",
      },
    },
  },
  {
    id: "shadow-banking-real-estate",
    title: "The $1.7T Shadow Banking Domino: Private Credit, Empty Offices & The 2007 Sequel",
    subtitle: "Unregulated private debt funds lent billions against downtown commercial towers at 9.5% rates. As regional pension funds face solvency write-downs, municipal property taxes are quietly stepping in.",
    category: "AI × Financial Markets",
    estimatedRuntime: "9 min 10 sec",
    wordCount: 1380,
    targetFormat: "Financial Thriller / Video Essay",
    date: "Updated 5h ago",
    impactScore: 90,
    sourceCatalyst: {
      outlet: "Wall Street Journal & S&P Global",
      timeAgo: "7 hours ago",
      headline: "$1.7 Trillion Private Credit Market Faces Refinancing Wall as Floating-Rate Office Loans Mature",
    },
    nodes: {
      macroTrigger: {
        title: "The $1.7T Floating-Rate Maturity Wall",
        date: "2024–2027 Refinancing Window",
        description:
          "Over $650 billion in commercial real estate loans held by non-bank private credit funds must be refinanced this year at interest rates nearly triple their origination costs, while office vacancy in top metros hovers near 23%.",
        metricTag: "9.5% SOFR Borrowing Costs",
        source: "Federal Reserve Financial Stability Report",
      },
      historicalParallel: {
        title: "2007 Bear Stearns Credit Fund Liquidation",
        period: "2007 (19-Year Historical Echo)",
        description:
          "In June 2007, two structured credit hedge funds managed by Bear Stearns suspended investor withdrawals after internal valuations lagged true market clearing prices. It took 15 months for the contagion to reach Lehman Brothers.",
        similarityScore: "86% Structural Opacity Match",
        lesson: "Losses are never eliminated in debt markets; they are only transferred to the party with the least liquidity.",
      },
      humanImpact: {
        title: "City Council Residential Property Tax Hikes",
        affectedGroup: "Suburban Homeowners & Public School Teachers",
        description:
          "As downtown office towers sell for 60% discounts, commercial property tax revenues crater. To maintain police, fire, and school budgets, municipal city halls are shifting the tax burden directly to residential homeowner assessments.",
        dollarOrPriceMetric: "+$850/year in Property Taxes",
        actionableTakeaway: "Inspect local municipal bond rating adjustments and city council budget deficit hearings.",
      },
    },
    script: {
      coldOpen: {
        title: "COLD OPEN: The Empty Glass Towers",
        timestamp: "0:00 – 1:15",
        visualCue:
          "[CAPCUT CUES]\n• 0:00-0:15: Night drone shot of downtown Chicago and San Francisco financial districts. Half the office windows are pitch black.\n• Audio SFX: Eerie wind howling between glass skyscrapers, followed by muffled financial gavel strike.\n• Text: '$1.7 TRILLION IN THE SHADOWS'.",
        narration:
          "If you walk through the financial district of almost any major American city on a Tuesday afternoon, you will notice something strange.\n\nThe skyscrapers are still gleaming in the sunlight. The brass revolving doors are polished. But behind those mirrored glass windows, millions of square feet are completely empty.\n\nNow here is the mystery: if the offices are empty and the tenants stopped paying rent, why hasn't the financial system collapsed? The answer is a trillion-dollar black box called private credit—and it might be the most dangerous financial experiment since 2007.",
      },
      actI: {
        title: "ACT I: The Invisible Bankers",
        timestamp: "1:15 – 3:45",
        visualCue:
          "[CAPCUT CUES]\n• Diagram animation: Traditional Banks (heavily regulated) vs Private Credit Funds (unregulated, no public mark-to-market).\n• Graphic showing floating rate loan repayments surging from 3% in 2021 to 10% in 2026.",
        narration:
          "After the 2008 financial crisis, Congress passed Dodd-Frank. They told banks: you cannot hold risky loans anymore.\n\nSo what happened? The risk didn't disappear. It moved across the street into private equity debt funds. These funds don't have to mark their assets to market every single day. If a commercial tower drops thirty percent in true value, a private credit manager can simply mark it at ninety-eight cents on the dollar and say, 'We are long-term holders.'\n\nIt is the financial equivalent of closing your eyes and pretending the fire alarm is just a musical ringtone.",
      },
      actII: {
        title: "ACT II: The Bear Stearns Playbook",
        timestamp: "3:45 – 6:15",
        visualCue:
          "[CAPCUT CUES]\n• Archival news montage: June 2007 Bear Stearns press conference.\n• Highlighted document: 'REDEMPTION GATES CLOSED'.\n• Visual comparison table: 2007 Subprime CLOs vs 2026 Commercial Real Estate Private Debt.",
        narration:
          "In June of 2007, two Bear Stearns hedge funds ran into the same accounting wall. They held subprime mortgage-backed securities that nobody wanted to buy at face value. For six months, the managers told investors everything was fine because their private models said so.\n\nThen one major institution asked for their cash back. The managers had to sell actual securities in the open market. And the moment the first real trade went through at sixty cents on the dollar, the entire illusion vanished overnight.",
      },
      actIII: {
        title: "ACT III: The City Hall Tax Transfer",
        timestamp: "6:15 – 9:10",
        visualCue:
          "[CAPCUT CUES]\n• City council meeting footage: Citizens protesting property tax reassessments.\n• Pie chart: City revenue breakdown (Commercial property tax dropping 40%, Residential forced to compensate).\n• Clear closing warning graphic.",
        narration:
          "Here is the cruel twist: Wall Street hedge funds will eventually negotiate their restructurings and take their tax write-offs. But city governments cannot declare bankruptcy overnight.\n\nWhen a forty-story office building that used to pay ten million dollars in annual property taxes is reassessed at a sixty percent discount, the city still has to pay the police officers, run the water filtration plants, and fund the school district.\n\nWhere does the missing revenue come from? It comes from the homeowner who bought a modest three-bedroom bungalow six miles away. The office tower defaulted, but you get the supplemental tax bill in your mailbox.",
      },
    },
  },
  {
    id: "rare-earths-auto-bubble",
    title: "The Lithium Reversal: China's Rare Earth Licensing & The 84-Month Car Loan",
    subtitle: "When export permits restrict battery minerals, replacement costs surge. In 2010, maritime mineral disputes drove auto electronics up 400%, stretching average consumer financing to 7 years.",
    category: "Geopolitics & Supply Chains",
    estimatedRuntime: "7 min 40 sec",
    wordCount: 1140,
    targetFormat: "Automotive & Macro Documentary",
    date: "Updated 7h ago",
    impactScore: 88,
    sourceCatalyst: {
      outlet: "Nikkei Asia & Reuters",
      timeAgo: "8 hours ago",
      headline: "China Implements Dual-Use Export Approvals for Battery-Grade Neodymium and Gallium Alloys",
    },
    nodes: {
      macroTrigger: {
        title: "Neodymium & Battery Mineral Licensing",
        date: "Recent Geopolitical Action",
        description:
          "New export compliance registries require foreign automotive and electronics manufacturers to verify non-military end use, doubling customs clearance times and driving spot premiums on magnet alloys up 35%.",
        metricTag: "+35% Spot Magnet Premiums",
        source: "Ministry of Commerce Bulletin",
      },
      historicalParallel: {
        title: "The 2010 Senkaku Islands Mineral Embargo",
        period: "2010 (16-Year Historical Echo)",
        description:
          "Following a maritime dispute, mineral shipments to Japanese automakers were informally halted for two months. Motor manufacturers had to redesign electric drivetrains with lower efficiency substitutes at four times the unit cost.",
        similarityScore: "82% Geopolitical Leverage Echo",
        lesson: "Component export controls hit the consumer market not at new car dealerships, but in the used car repair garage.",
      },
      humanImpact: {
        title: "The 84-Month Auto Loan Reality",
        affectedGroup: "Everyday Commuters & Used Car Buyers",
        description:
          "Replacement battery pack modules for 7-year-old hybrid and electric vehicles jump from $3,500 to $6,200. To keep monthly payments affordable, auto lenders are pushing routine consumer financing terms past 7 years.",
        dollarOrPriceMetric: "84-Month Average Loan Term",
        actionableTakeaway: "Review mechanical breakdown insurance riders before vehicle warranty expiration.",
      },
    },
    script: {
      coldOpen: {
        title: "COLD OPEN: The Thousand-Dollar Magnet",
        timestamp: "0:00 – 1:10",
        visualCue:
          "[CAPCUT CUES]\n• 0:00-0:15: Macro shot of a small silver permanent magnet snapping violently onto a steel plate with a sharp clack.\n• Audio SFX: High-frequency ping, followed by hum of an electric car motor accelerating.\n• Lower third: 'NEODYMIUM // 90% PROCESSED IN ONE COUNTRY'.",
        narration:
          "This tiny piece of metal fits inside the palm of your hand. It weighs less than a coffee mug.\n\nYet without it, every electric vehicle in the world is just a three-ton paperweight. You cannot build a modern automotive drive motor, a wind turbine generator, or an F-35 jet actuator without it.\n\nAnd for the last thirty years, Western automakers made a calculated gamble: they outsourced the entire messy, toxic chemical refining process to a single country. Now, the bill for that shortcut is parked in your driveway.",
      },
      actI: {
        title: "ACT I: The Chokepoint in the Processing Vat",
        timestamp: "1:10 – 3:00",
        visualCue:
          "[CAPCUT CUES]\n• Map animation: Mining vs Refining locations (mining is global, but chemical separation is 92% concentrated in China).\n• B-roll: Automated car assembly line pausing.",
        narration:
          "The common misconception about rare earth elements is that they are rare. In reality, they are scattered all across the earth's crust. What is rare is the political tolerance for boiling thousands of tons of rock in sulfuric acid to extract microscopic traces of neodymium and dysprosium.\n\nWhen export licensing rules tighten, the disruption doesn't look like an oil embargo with lines at the gas pump. It looks like quiet delays at the customs dock, container ships waiting for permits, and replacement parts quietly backordered for twelve weeks.",
      },
      actII: {
        title: "ACT II: The 2010 Senkaku Precedent",
        timestamp: "3:00 – 5:15",
        visualCue:
          "[CAPCUT CUES]\n• Archival 2010 video: Coast guard patrol boats in East China Sea.\n• Stock market chart: Tokyo automotive stocks tumbling as supply lines dry up.",
        narration:
          "In September 2010, a Chinese fishing trawler collided with Japanese coast guard vessels near disputed islands. Within days, customs officials quietly halted rare earth shipments to Japan.\n\nJapanese automakers were caught completely off guard. It exposed how fragile just-in-time manufacturing truly is when your tier-three suppliers rely on a single geopolitical source. Prices spiked four hundred percent before diplomacy calmed the waters. But the blueprint had been drawn.",
      },
      actIII: {
        title: "ACT III: The Seven-Year Car Payment",
        timestamp: "5:15 – 7:40",
        visualCue:
          "[CAPCUT CUES]\n• Close-up: Car loan contract with the 'Term: 84 Months' highlighted in yellow.\n• Montage: Families looking stressed at an automotive repair counter.\n• Clean closing takeaway graphic.",
        narration:
          "What does this mean for someone trying to get to work on a Monday morning?\n\nIt means the used vehicle that used to be a reliable five-thousand-dollar stopgap is becoming a financial minefield. When a replacement battery module costs six thousand dollars, insurance companies write off vehicles for minor fender benders because the sensors and drive units cost more than the chassis.\n\nTo make cars affordable again, banks have stretched loan terms to seven years. You are paying interest on element twenty-nine long after the vehicle warranty has expired.",
      },
    },
  },
];
