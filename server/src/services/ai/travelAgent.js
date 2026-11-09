const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class TravelAgent {
  async planTrip(params) {
    const {
      prompt,
      destination = 'Goa',
      startingLocation = 'Mumbai',
      durationDays = 5,
      travelersCount = 4,
      totalBudget = 60000,
      travelStyle = 'Budget',
      interests = ['Beaches', 'Food', 'Relaxation']
    } = params;

    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const userPrompt = prompt || `Plan a ${durationDays}-day trip to ${destination} starting from ${startingLocation} for ${travelersCount} travelers. Total budget: ₹${totalBudget} (approx ₹${Math.round(totalBudget / (travelersCount || 1))} per person). Travel style: ${travelStyle}. Interests: ${interests.join(', ')}.`;

        const messages = [
          { role: 'system', content: promptTemplates.TRAVEL_PLANNER },
          { role: 'user', content: userPrompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.6 });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed && parsed.itinerary && parsed.itinerary.length > 0) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[TravelAgent] Live generation failed, using intelligent fallback:', err.message);
      }
    }

    // High quality intelligent demo generator
    return {
      success: true,
      data: this.generateStructuredSampleTrip({
        destination,
        startingLocation,
        durationDays: parseInt(durationDays, 10) || 5,
        travelersCount: parseInt(travelersCount, 10) || 4,
        totalBudget: parseInt(totalBudget, 10) || 60000,
        travelStyle,
        interests
      }),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  generateStructuredSampleTrip({ destination, startingLocation, durationDays, travelersCount, totalBudget, travelStyle, interests }) {
    const perPerson = Math.round(totalBudget / (travelersCount || 1));
    const transportShare = Math.round(totalBudget * 0.25);
    const stayShare = Math.round(totalBudget * 0.35);
    const foodShare = Math.round(totalBudget * 0.20);
    const activitiesShare = Math.round(totalBudget * 0.12);
    const miscShare = totalBudget - (transportShare + stayShare + foodShare + activitiesShare);

    const itinerary = [];
    const themes = [
      'Arrival, Check-in & Scenic Sunset',
      'Heritage Exploration & Coastal Cuisine',
      'Water Sports, Adventure & Coastal Vibes',
      'Artisan Markets, Culture & Leisure',
      'Sunrise Walk, Souvenir Shopping & Departure'
    ];

    for (let day = 1; day <= durationDays; day++) {
      const themeIndex = (day - 1) % themes.length;
      itinerary.push({
        day,
        title: `Day ${day}: ${destination} Experience`,
        theme: themes[themeIndex],
        activities: [
          {
            time: '09:00 AM',
            title: day === 1 ? `Arrive in ${destination} & Check-in` : `Morning Exploration & Sightseeing`,
            description: day === 1 ? `Travel from ${startingLocation}, transfer to accommodation, and refresh.` : `Visit prominent local attractions and enjoy fresh morning weather.`,
            location: `${destination} Central`,
            estimatedCost: Math.round(activitiesShare / durationDays / 2)
          },
          {
            time: '02:30 PM',
            title: `Immersive Cultural / Recreational Activity`,
            description: `Experience ${interests.length ? interests.join(' and ') : 'local sightseeing'} tailored for your group.`,
            location: `${destination} Coast / District`,
            estimatedCost: Math.round(activitiesShare / durationDays / 2)
          },
          {
            time: '07:00 PM',
            title: `Evening Stroll & Leisure Dinner`,
            description: `Walk through local promenade or vibrant market, followed by authentic regional dinner.`,
            location: `${destination} Promenade`,
            estimatedCost: 0
          }
        ],
        meals: {
          breakfast: 'Local bakery & specialty coffee',
          lunch: 'Authentic regional thali or coastal cafe',
          dinner: 'Popular evening restaurant with ambient seating'
        },
        stay: `${travelStyle} boutique hotel or villa near central ${destination}`
      });
    }

    return {
      name: `${durationDays}-Day ${destination} Escape`,
      startingLocation,
      destination,
      durationDays,
      travelersCount,
      travelStyle,
      overview: `A balanced ${durationDays}-day journey to ${destination} designed for ${travelersCount} travelers with ${travelStyle.toLowerCase()} comfort. Focuses on ${interests.join(', ')} while staying well within the ₹${totalBudget.toLocaleString('en-IN')} total estimated budget.`,
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
      packingChecklist: [
        { category: 'Clothing', item: 'Breathable lightweight shirts/t-shirts', checked: false },
        { category: 'Clothing', item: 'Comfortable walking shoes & sandals', checked: false },
        { category: 'Essentials', item: 'Valid ID proofs & travel tickets', checked: false },
        { category: 'Health & Toiletries', item: 'Sunscreen (SPF 50), moisturizer & first-aid kit', checked: false },
        { category: 'Electronics', item: 'Power bank, charging cables & camera', checked: false }
      ],
      preparationChecklist: [
        { task: `Confirm transit from ${startingLocation} to ${destination}`, checked: false },
        { task: 'Verify hotel booking and check-in timings', checked: false },
        { task: 'Withdraw emergency cash / verify UPI payment limits', checked: false },
        { task: 'Check local weather forecast 24 hours prior to departure', checked: false }
      ]
    };
  }
}

module.exports = new TravelAgent();

