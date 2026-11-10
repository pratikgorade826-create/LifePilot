const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');
const tripFeasibilityChecker = require('./tripFeasibilityChecker');

class TravelAgent {
  async planTrip(params) {
    const {
      prompt,
      destination = 'Goa',
      startingLocation = 'Mumbai',
      durationDays = 5,
      departureDate,
      returnDate,
      travelersCount = 1,
      totalBudget = 30000,
      travelStyle = 'Standard',
      interests = ['Beaches', 'Food', 'Relaxation'],
      additionalPreferences = ''
    } = params;

    const parsedDuration = parseInt(durationDays, 10) || 5;
    const parsedTravelers = Math.max(1, parseInt(travelersCount, 10) || 1);
    const parsedBudget = Math.max(1000, parseInt(totalBudget, 10) || 30000);
    const perPerson = Math.round(parsedBudget / parsedTravelers);

    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const userPrompt = prompt || `Plan a ${parsedDuration}-day trip to ${destination} starting from ${startingLocation} for ${parsedTravelers} traveler(s).
Total estimated budget: ₹${parsedBudget} (approx ₹${perPerson} per person).
Travel style: ${travelStyle}.
Key interests: ${interests && interests.length ? interests.join(', ') : 'Sightseeing, Local food'}.
${additionalPreferences ? `Special preferences: ${additionalPreferences}` : ''}
${departureDate ? `Departure date: ${new Date(departureDate).toDateString()}` : ''}
${returnDate ? `Return date: ${new Date(returnDate).toDateString()}` : ''}

Provide a complete day-by-day itinerary with 3 scheduled activities per day (time, title, description, location, estimatedCost), regional dining recommendations (breakfast, lunch, dinner), accommodation type, estimated budget breakdown, packing checklist, and pre-trip preparation checklist.`;

        const messages = [
          { role: 'system', content: promptTemplates.TRAVEL_PLANNER },
          { role: 'user', content: userPrompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.6 });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed) {
          const validated = this.validateAndNormalizeTripPlan(parsed, {
            destination,
            startingLocation,
            durationDays: parsedDuration,
            travelersCount: parsedTravelers,
            totalBudget: parsedBudget,
            travelStyle,
            interests,
            additionalPreferences
          });

          if (validated) {
            const feasibilityReport = tripFeasibilityChecker.checkTripFeasibility(validated);
            validated.feasibilityScore = feasibilityReport.overallScore;
            validated.feasibilityReport = feasibilityReport;
            return {
              success: true,
              data: validated,
              isDemoOutput: res.isDemoOutput,
              provider: res.provider
            };
          }
        }
      } catch (err) {
        console.warn('[TravelAgent] Live generation failed or produced invalid structure, using fallback:', err.message);
      }
    }

    // High quality intelligent generator
    const sampleTrip = this.generateStructuredSampleTrip({
      destination,
      startingLocation,
      durationDays: parsedDuration,
      travelersCount: parsedTravelers,
      totalBudget: parsedBudget,
      travelStyle,
      interests,
      additionalPreferences,
      prompt
    });

    const feasibilityReport = tripFeasibilityChecker.checkTripFeasibility(sampleTrip);
    sampleTrip.feasibilityScore = feasibilityReport.overallScore;
    sampleTrip.feasibilityReport = feasibilityReport;

    return {
      success: true,
      data: sampleTrip,
      isDemoOutput: true,
      provider: 'intelligent-local-generator'
    };
  }

  /**
   * Validates and sanitizes AI-generated trip JSON
   */
  validateAndNormalizeTripPlan(raw, params) {
    if (!raw || typeof raw !== 'object') return null;

    const {
      destination,
      startingLocation,
      durationDays,
      travelersCount,
      totalBudget,
      travelStyle,
      interests
    } = params;

    // Validate or synthesize itinerary
    if (!Array.isArray(raw.itinerary) || raw.itinerary.length === 0) {
      return null;
    }

    const perPerson = Math.round(totalBudget / (travelersCount || 1));
    const normalizedItinerary = [];

    for (let i = 0; i < durationDays; i++) {
      const dayNum = i + 1;
      const rawDay = raw.itinerary[i] || {};

      const activities = Array.isArray(rawDay.activities) && rawDay.activities.length > 0
        ? rawDay.activities.map((act, actIdx) => ({
            time: act.time || (actIdx === 0 ? '09:30 AM' : actIdx === 1 ? '02:30 PM' : '07:00 PM'),
            title: act.title || `Day ${dayNum} Activity ${actIdx + 1}`,
            description: act.description || `Explore ${destination} highlights and local spots.`,
            location: act.location || destination,
            estimatedCost: typeof act.estimatedCost === 'number' ? Math.max(0, act.estimatedCost) : 0
          }))
        : [
            {
              time: '10:00 AM',
              title: dayNum === 1 ? `Arrive in ${destination} & Check-in` : `Morning Sightseeing in ${destination}`,
              description: dayNum === 1 ? `Travel from ${startingLocation} and settle in.` : `Discover iconic landmarks in ${destination}.`,
              location: `${destination} Central`,
              estimatedCost: 500
            },
            {
              time: '03:00 PM',
              title: `Afternoon Cultural & Scenic Tour`,
              description: `Engage with ${interests.join(' & ')} experiences.`,
              location: destination,
              estimatedCost: 1000
            },
            {
              time: '07:30 PM',
              title: `Evening Leisure & Dining`,
              description: `Enjoy local cuisine and relaxed evening atmosphere.`,
              location: `${destination} Promenade`,
              estimatedCost: 0
            }
          ];

      const meals = rawDay.meals && typeof rawDay.meals === 'object'
        ? {
            breakfast: rawDay.meals.breakfast || 'Local specialty breakfast & beverages',
            lunch: rawDay.meals.lunch || 'Regional lunch at a recommended eatery',
            dinner: rawDay.meals.dinner || 'Evening dining with regional flavors'
          }
        : {
            breakfast: 'Local specialty breakfast',
            lunch: 'Traditional regional lunch',
            dinner: 'Evening dining & regional specialties'
          };

      normalizedItinerary.push({
        day: dayNum,
        title: rawDay.title || `Day ${dayNum}: ${destination} Exploration`,
        theme: rawDay.theme || `Day ${dayNum} Highlights`,
        activities,
        meals,
        stay: rawDay.stay || `${travelStyle} accommodation in central ${destination}`
      });
    }

    // Validate & normalize budget breakdown
    const rawBudget = raw.budgetBreakdown || {};
    let transportation = parseInt(rawBudget.transportation, 10);
    let accommodation = parseInt(rawBudget.accommodation, 10);
    let food = parseInt(rawBudget.food, 10);
    let activities = parseInt(rawBudget.activities, 10);
    let miscellaneous = parseInt(rawBudget.miscellaneous, 10);

    // If budget values are missing or invalid, calculate proportional breakdown
    if (isNaN(transportation) || isNaN(accommodation) || isNaN(food) || isNaN(activities) || isNaN(miscellaneous)) {
      transportation = Math.round(totalBudget * 0.25);
      accommodation = Math.round(totalBudget * 0.35);
      food = Math.round(totalBudget * 0.20);
      activities = Math.round(totalBudget * 0.12);
      miscellaneous = totalBudget - (transportation + accommodation + food + activities);
    }

    const totalEstimated = transportation + accommodation + food + activities + miscellaneous;

    // Validate packing checklist
    const packingChecklist = Array.isArray(raw.packingChecklist) && raw.packingChecklist.length > 0
      ? raw.packingChecklist.map(p => ({
          category: p.category || 'General',
          item: typeof p === 'string' ? p : p.item || 'Travel essential',
          checked: Boolean(p.checked)
        }))
      : [
          { category: 'Clothing', item: 'Weather-appropriate breathable clothing', checked: false },
          { category: 'Clothing', item: 'Comfortable walking footwear', checked: false },
          { category: 'Essentials', item: 'Government ID proofs & travel tickets', checked: false },
          { category: 'Health & Toiletries', item: 'Personal toiletries & basic medications', checked: false },
          { category: 'Electronics', item: 'Portable power bank and device chargers', checked: false }
        ];

    // Validate preparation checklist
    const preparationChecklist = Array.isArray(raw.preparationChecklist) && raw.preparationChecklist.length > 0
      ? raw.preparationChecklist.map(pr => ({
          task: typeof pr === 'string' ? pr : pr.task || 'Review trip itinerary',
          checked: Boolean(pr.checked)
        }))
      : [
          { task: `Confirm transit from ${startingLocation} to ${destination}`, checked: false },
          { task: `Verify hotel booking and reservation vouchers`, checked: false },
          { task: 'Check local weather forecast 24 hours prior to departure', checked: false },
          { task: 'Ensure necessary cash and digital payment apps are ready', checked: false }
        ];

    return {
      name: raw.name || `${durationDays}-Day ${destination} Trip`,
      startingLocation,
      destination,
      durationDays,
      travelersCount,
      travelStyle,
      interests,
      overview: raw.overview || `A tailored ${durationDays}-day itinerary for ${destination} focusing on ${interests.join(', ')} with an estimated total budget of ₹${totalBudget.toLocaleString('en-IN')}.`,
      itinerary: normalizedItinerary,
      budgetBreakdown: {
        transportation,
        accommodation,
        food,
        activities,
        miscellaneous,
        totalEstimated,
        budgetPerPerson: Math.round(totalEstimated / (travelersCount || 1)),
        isEstimateNotice: 'All figures are reasonable market approximations for planning purposes; real-time booking prices vary.'
      },
      packingChecklist,
      preparationChecklist
    };
  }

  /**
   * Generates a realistic, structured, mathematically consistent trip plan
   */
  generateStructuredSampleTrip({
    destination,
    startingLocation,
    durationDays,
    travelersCount,
    totalBudget,
    travelStyle,
    interests = [],
    additionalPreferences = '',
    prompt = ''
  }) {
    const perPerson = Math.round(totalBudget / (travelersCount || 1));

    // Proportional breakdown based on travel style
    let stayRatio = 0.35;
    let transportRatio = 0.25;
    let foodRatio = 0.20;
    let activitiesRatio = 0.12;

    if (travelStyle === 'Luxury') {
      stayRatio = 0.42;
      transportRatio = 0.23;
      foodRatio = 0.20;
      activitiesRatio = 0.10;
    } else if (travelStyle === 'Budget') {
      stayRatio = 0.26;
      transportRatio = 0.30;
      foodRatio = 0.24;
      activitiesRatio = 0.12;
    }

    const transportShare = Math.round(totalBudget * transportRatio);
    const stayShare = Math.round(totalBudget * stayRatio);
    const foodShare = Math.round(totalBudget * foodRatio);
    const activitiesShare = Math.round(totalBudget * activitiesRatio);
    const miscShare = totalBudget - (transportShare + stayShare + foodShare + activitiesShare);

    const itinerary = [];
    const themes = [
      'Arrival, Check-in & Scenic Sunset Orientation',
      'Heritage Exploration, Iconic Sights & Coastal Cuisine',
      'Nature Trails, Adventure Activities & Local Flavors',
      'Artisan Markets, Cultural Immersion & Relaxed Vibes',
      'Sunrise Views, Souvenir Shopping & Departure Preparations'
    ];

    const interestStr = interests.length ? interests.join(' & ') : 'Local Sightseeing';

    for (let day = 1; day <= durationDays; day++) {
      const themeIndex = (day - 1) % themes.length;
      const isFirstDay = day === 1;
      const isLastDay = day === durationDays;

      itinerary.push({
        day,
        title: isFirstDay
          ? `Day 1: Arrival & Welcome to ${destination}`
          : isLastDay
          ? `Day ${day}: Farewell ${destination} & Departure`
          : `Day ${day}: ${destination} Experience`,
        theme: themes[themeIndex],
        activities: [
          {
            time: '09:30 AM',
            title: isFirstDay
              ? `Arrive from ${startingLocation} & Hotel Check-in`
              : `Morning Exploration & Key Landmarks`,
            description: isFirstDay
              ? `Transfer from arrival terminal to accommodation in ${destination}, check-in, and freshen up.`
              : `Visit prominent sights and enjoy morning views tailored to ${interestStr}.`,
            location: `${destination} Central`,
            estimatedCost: Math.round(activitiesShare / durationDays / 2)
          },
          {
            time: '02:30 PM',
            title: isLastDay
              ? `Last-Minute Souvenirs & Artisan Shopping`
              : `Curated Experience: ${interestStr}`,
            description: isLastDay
              ? `Browse local craft markets and pick up authentic regional keepsakes.`
              : `Engage with immersive ${interestStr} highlights across ${destination}.`,
            location: `${destination} District`,
            estimatedCost: Math.round(activitiesShare / durationDays / 2)
          },
          {
            time: '07:30 PM',
            title: isLastDay
              ? `Farewell Dinner & Transfer Preparation`
              : `Evening Promenade & Regional Dinner`,
            description: isLastDay
              ? `Reflect on the journey over a memorable regional dinner before departure.`
              : `Take an ambient evening stroll followed by dining at a top-rated local establishment.`,
            location: `${destination} Promenade`,
            estimatedCost: 0
          }
        ],
        meals: {
          breakfast: isFirstDay ? 'Travel snacks & arrival coffee' : 'Regional specialty breakfast & artisanal tea',
          lunch: 'Authentic local thali or celebrated neighborhood bistro',
          dinner: 'Ambient regional dinner featuring local delicacies'
        },
        stay: `${travelStyle} boutique stay or hotel near central ${destination}`
      });
    }

    // Packing items tailored to interests
    const packingChecklist = [
      { category: 'Essentials', item: 'Valid Government Photo ID proofs & tickets', checked: true },
      { category: 'Clothing', item: `Comfortable ${travelStyle.toLowerCase()} walking attire & sandals`, checked: false },
      { category: 'Clothing', item: 'Light rain jacket or evening layer', checked: false },
      { category: 'Health & Toiletries', item: 'Sunscreen (SPF 50), moisturizer & personal medications', checked: false },
      { category: 'Electronics', item: 'High-capacity power bank, cables & universal adapter', checked: false }
    ];

    if (interests.includes('Beaches')) {
      packingChecklist.push({ category: 'Clothing', item: 'Beachwear, flip-flops & quick-dry towel', checked: false });
      packingChecklist.push({ category: 'Essentials', item: 'Waterproof phone pouch & sunglasses', checked: false });
    }
    if (interests.includes('Mountains') || interests.includes('Adventure')) {
      packingChecklist.push({ category: 'Clothing', item: 'Trekking shoes & warm layer', checked: false });
      packingChecklist.push({ category: 'Essentials', item: 'Reusable hydration bottle & small daypack', checked: false });
    }
    if (interests.includes('Nightlife')) {
      packingChecklist.push({ category: 'Clothing', item: 'Smart evening attire for lounges/clubs', checked: false });
    }

    // Preparation tasks
    const preparationChecklist = [
      { task: `Book or confirm transport tickets from ${startingLocation} to ${destination}`, checked: true },
      { task: `Verify reservation and check-in time at ${destination} accommodation`, checked: false },
      { task: `Download offline maps of ${destination} and emergency contact numbers`, checked: false },
      { task: `Ensure sufficient digital payment (UPI/Card) balance and carry emergency cash`, checked: false },
      { task: 'Check weather forecast 48 hours prior to departure', checked: false }
    ];

    let overview = `A well-crafted ${durationDays}-day journey from ${startingLocation} to ${destination} designed for ${travelersCount} traveler(s) with ${travelStyle.toLowerCase()} comfort. Focuses on ${interestStr} while staying well within the ₹${totalBudget.toLocaleString('en-IN')} total estimated budget (approx ₹${perPerson.toLocaleString('en-IN')} per person).`;

    if (additionalPreferences) {
      overview += ` Incorporates preferences: "${additionalPreferences}".`;
    }

    return {
      name: `${durationDays}-Day ${destination} ${travelStyle} Escape`,
      startingLocation,
      destination,
      durationDays,
      travelersCount,
      travelStyle,
      interests,
      additionalPreferences,
      overview,
      itinerary,
      budgetBreakdown: {
        transportation: transportShare,
        accommodation: stayShare,
        food: foodShare,
        activities: activitiesShare,
        miscellaneous: miscShare,
        totalEstimated: totalBudget,
        budgetPerPerson: perPerson,
        isEstimateNotice: 'All figures are reasonable market approximations for planning purposes; real-time booking prices vary.'
      },
      packingChecklist,
      preparationChecklist
    };
  }

  /**
   * Regenerate a single specific day in an existing itinerary
   */
  async regenerateDay({ trip, dayNumber, preferences = '', feedback = '' }) {
    if (!trip) throw new Error('Trip context is required.');
    const dayNum = parseInt(dayNumber, 10);
    if (!dayNum || dayNum < 1 || dayNum > (trip.itinerary?.length || 10)) {
      throw new Error(`Invalid day number: ${dayNumber}.`);
    }

    const currentDay = (trip.itinerary || []).find(d => d.day === dayNum) || {};
    const destination = trip.destination || 'Destination';
    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const prompt = `Current Trip: "${trip.name || destination}", Destination: "${destination}", Style: "${trip.travelStyle || 'Standard'}".
Current Day ${dayNum} Plan:
Title: ${currentDay.title}
Theme: ${currentDay.theme}
Activities: ${(currentDay.activities || []).map(a => a.title).join(', ')}

User Request for Day ${dayNum}:
Feedback/Adjustment: "${feedback || 'Provide a fresh alternative set of activities'}"
Preferences: "${preferences || trip.additionalPreferences || ''}"

Generate a fresh, highly engaging replacement schedule for Day ${dayNum}.`;

        const messages = [
          { role: 'system', content: promptTemplates.DAY_REGENERATOR },
          { role: 'user', content: prompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.5, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && Array.isArray(parsed.activities) && parsed.activities.length > 0) {
          const regenerated = {
            day: dayNum,
            title: parsed.title || `Day ${dayNum}: Refreshed ${destination} Highlights`,
            theme: parsed.theme || `Tailored Day ${dayNum} Experience`,
            activities: parsed.activities.map((a, i) => ({
              time: a.time || (i === 0 ? '09:30 AM' : i === 1 ? '02:30 PM' : '07:00 PM'),
              title: a.title || `Activity ${i + 1}`,
              description: a.description || `Explore ${destination}`,
              location: a.location || destination,
              estimatedCost: typeof a.estimatedCost === 'number' ? Math.max(0, a.estimatedCost) : 300
            })),
            meals: parsed.meals || currentDay.meals || { breakfast: 'Local specialty cafe', lunch: 'Regional lunch', dinner: 'Fine evening dining' },
            stay: parsed.stay || currentDay.stay || `${trip.travelStyle || 'Standard'} accommodation in ${destination}`
          };

          return {
            success: true,
            day: regenerated,
            explanation: parsed.explanation || `Day ${dayNum} refreshed with new activities tailored to your preferences.`,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[TravelAgent] Day regeneration failed with AI, using intelligent fallback:', err.message);
      }
    }

    // Intelligent fallback for regenerating a single day
    const feedbackLower = (feedback + ' ' + preferences).toLowerCase();
    let theme = `Day ${dayNum} Alternative Trail`;
    let activities = [];

    if (feedbackLower.includes('relax') || feedbackLower.includes('chill') || feedbackLower.includes('beach')) {
      theme = 'Coastal Relaxation & Sunset Leisure';
      activities = [
        { time: '10:00 AM', title: `Scenic Coastal Walk & Cafe Brunch in ${destination}`, description: 'Late morning stroll with iced coffees and artisanal breakfast.', location: `${destination} Coast`, estimatedCost: 400 },
        { time: '03:00 PM', title: 'Ayurvedic Wellness & Spa Therapy', description: 'Rejuvenating herbal massage and steam relaxation session.', location: `${destination} Wellness Center`, estimatedCost: 1500 },
        { time: '06:30 PM', title: 'Sunset Cocktails & Beachfront Acoustic Music', description: 'Watch the sun dip beneath the horizon with refreshing drinks.', location: `${destination} Sunset Shack`, estimatedCost: 800 }
      ];
    } else if (feedbackLower.includes('rain') || feedbackLower.includes('indoor') || feedbackLower.includes('museum')) {
      theme = 'Indoor Heritage & Culinary Discovery';
      activities = [
        { time: '10:00 AM', title: `${destination} State Museum & Cultural Gallery`, description: 'Sheltered exploration of ancient artifacts, textiles, and local history.', location: `${destination} Central Museum`, estimatedCost: 200 },
        { time: '02:30 PM', title: 'Regional Cooking Masterclass & Tasting', description: 'Hands-on indoor workshop preparing traditional authentic curries.', location: 'Local Culinary Studio', estimatedCost: 1200 },
        { time: '07:00 PM', title: 'Artisanal Covered Market & Souvenir Shopping', description: 'Sheltered shopping arcade for spices, handicrafts, and teas.', location: `${destination} Covered Bazaar`, estimatedCost: 0 }
      ];
    } else {
      theme = `Curated Hidden Gems & Cultural Immersion`;
      activities = [
        { time: '09:00 AM', title: `Heritage Old Quarter Walking Trail in ${destination}`, description: 'Guided stroll through historic colonial architecture and ancient streets.', location: `${destination} Old Town`, estimatedCost: 300 },
        { time: '02:00 PM', title: 'Organic Spice & Botanical Plantation Visit', description: 'Aromatic garden walk followed by a traditional buffet lunch.', location: `${destination} Spice Garden`, estimatedCost: 700 },
        { time: '07:30 PM', title: 'Evening Rooftop Dining with Panoramic Views', description: 'Dine under the stars with live classical music and regional dishes.', location: 'Rooftop Lounge', estimatedCost: 1200 }
      ];
    }

    const regenerated = {
      day: dayNum,
      title: `Day ${dayNum}: ${theme}`,
      theme,
      activities,
      meals: {
        breakfast: 'Artisanal bakery and specialty local brew',
        lunch: 'Traditional plantation or heritage cafe lunch',
        dinner: 'Rooftop dinner overlooking the vibrant skyline'
      },
      stay: currentDay.stay || `${trip.travelStyle || 'Standard'} accommodation in ${destination}`
    };

    return {
      success: true,
      day: regenerated,
      explanation: `Successfully customized Day ${dayNum} to emphasize ${theme}.`,
      isDemoOutput: true,
      provider: 'intelligent-local-regenerator'
    };
  }
}

module.exports = new TravelAgent();
