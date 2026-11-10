const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class ScenarioSimulator {
  /**
   * Simulate a What-if scenario against a saved trip
   */
  async simulateScenario({ trip, scenarioQuery, scenarioName }) {
    if (!trip) throw new Error('Trip is required for simulation.');
    if (!scenarioQuery || !scenarioQuery.trim()) throw new Error('Scenario query is required.');

    const cleanQuery = scenarioQuery.trim();
    const activeProvider = aiProvider.getActiveProvider();

    const originalBudget = trip.totalBudget || 30000;
    const originalDuration = trip.durationDays || (trip.itinerary ? trip.itinerary.length : 5);
    const originalTravelers = trip.travelersCount || 1;

    if (activeProvider !== 'demo') {
      try {
        const prompt = `Current Trip Details:
- Name: "${trip.name || trip.destination}"
- Destination: "${trip.destination}"
- Starting Location: "${trip.startingLocation}"
- Duration: ${originalDuration} days
- Travelers: ${originalTravelers}
- Total Budget: ₹${originalBudget} (₹${Math.round(originalBudget / originalTravelers)}/person)
- Current Itinerary Summary:
${(trip.itinerary || []).map(d => `Day ${d.day}: ${d.title} (${d.activities?.map(a => a.title).join(', ')})`).join('\n')}

User What-If Simulation Request:
"${cleanQuery}"

Simulate this alternative scenario. Produce a complete modified itinerary, budget recalculation, duration adjustment, added/removed activities, advantages, disadvantages, potential risks, and feasibility grade.`;

        const messages = [
          { role: 'system', content: promptTemplates.SCENARIO_SIMULATOR },
          { role: 'user', content: prompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.4, json: true });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed && parsed.itinerary && Array.isArray(parsed.itinerary)) {
          const normalized = this.normalizeSimulationOutput(parsed, trip, cleanQuery, scenarioName);
          return {
            success: true,
            data: normalized,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[ScenarioSimulator] AI simulation failed, using intelligent deterministic fallback:', err.message);
      }
    }

    // High quality deterministic simulation fallback
    const simulated = this.generateDeterministicSimulation(trip, cleanQuery, scenarioName);
    return {
      success: true,
      data: simulated,
      isDemoOutput: true,
      provider: 'intelligent-local-simulator'
    };
  }

  normalizeSimulationOutput(parsed, trip, query, scenarioName) {
    const originalBudget = trip.totalBudget || 30000;
    const originalDuration = trip.durationDays || (trip.itinerary ? trip.itinerary.length : 5);
    const originalTravelers = trip.travelersCount || 1;

    // Detect requested duration in query
    let requestedDuration = null;
    const durMatch = query.match(/(?:extend|expand|to|for)\s*(\d+)\s*days?/i);
    if (durMatch) {
      requestedDuration = parseInt(durMatch[1], 10);
    }

    let proposedDuration = parseInt(parsed.proposedDuration, 10) || parsed.changes?.duration?.proposed || requestedDuration || (parsed.itinerary?.length || originalDuration);
    let proposedBudget = parseInt(parsed.proposedBudget, 10) || originalBudget;
    const proposedTravelers = parsed.changes?.travelers?.proposed || originalTravelers;

    let itinerary = Array.isArray(parsed.itinerary) ? [...parsed.itinerary] : [];

    // If proposed duration > current itinerary length, synthesize extra days
    if (proposedDuration > itinerary.length) {
      for (let d = itinerary.length + 1; d <= proposedDuration; d++) {
        itinerary.push({
          day: d,
          title: `Day ${d}: Extended ${trip.destination || 'Destination'} Highlights`,
          theme: 'Coastal & Cultural Discovery',
          activities: [
            { time: '10:00 AM', title: `Day ${d} Sightseeing & Local Trails`, description: 'Explore scenic landmarks and local trails.', location: trip.destination, estimatedCost: 500 },
            { time: '03:30 PM', title: `Day ${d} Heritage & Artisan Crafts`, description: 'Engage with local artisans and scenic views.', location: trip.destination, estimatedCost: 400 },
            { time: '07:30 PM', title: 'Sunset Leisure Dining', description: 'Relaxed evening dining with regional flavors.', location: trip.destination, estimatedCost: 0 }
          ],
          meals: { breakfast: 'Local Breakfast', lunch: 'Regional Lunch', dinner: 'Specialty Dinner' },
          stay: `${trip.travelStyle || 'Standard'} accommodation in ${trip.destination}`
        });
      }
    }

    // Weather contingency adaptation
    if (query.toLowerCase().includes('rain') && itinerary.length >= 2) {
      const currentTheme = (itinerary[1].theme || '').toLowerCase();
      if (!currentTheme.includes('rain') && !currentTheme.includes('indoor')) {
        itinerary[1].theme = 'Indoor Culture & Heritage Haven (Rain-Safe Contingency)';
      }
    }

    return {
      name: scenarioName || parsed.scenarioName || `Simulation: ${query.slice(0, 40)}`,
      scenarioQuery: query,
      changes: parsed.changes || { note: query },
      originalBudget,
      proposedBudget,
      costDifference: proposedBudget - originalBudget,
      costPerPerson: Math.round(proposedBudget / proposedTravelers),
      originalDuration,
      proposedDuration,
      transportChanges: parsed.transportChanges || '',
      addedActivities: parsed.addedActivities || [],
      removedActivities: parsed.removedActivities || [],
      itinerary,
      budgetBreakdown: parsed.budgetBreakdown || this.computeProportionalBreakdown(proposedBudget),
      warnings: parsed.warnings || [],
      advantages: parsed.advantages || [],
      disadvantages: parsed.disadvantages || [],
      feasibility: parsed.feasibility || (proposedBudget < originalBudget * 0.5 ? 'challenging' : 'highly_feasible'),
      feasibilityScore: parsed.feasibilityScore || (parsed.feasibility === 'challenging' ? 65 : 90)
    };
  }

  generateDeterministicSimulation(trip, query, scenarioName) {
    const text = query.toLowerCase();
    const originalBudget = trip.totalBudget || 30000;
    const originalDuration = trip.durationDays || (trip.itinerary ? trip.itinerary.length : 5);
    const originalTravelers = trip.travelersCount || 1;
    const baseItinerary = JSON.parse(JSON.stringify(trip.itinerary || []));

    let proposedDuration = originalDuration;
    let proposedBudget = originalBudget;
    let proposedTravelers = originalTravelers;
    let transportChanges = '';
    const addedActivities = [];
    const removedActivities = [];
    const warnings = [];
    const advantages = [];
    const disadvantages = [];
    let feasibility = 'highly_feasible';
    let feasibilityScore = 90;
    let modifiedItinerary = [...baseItinerary];

    // Case 1: Duration extension / reduction
    const daysMatch = text.match(/(\d+)\s*days?/i);
    const isExtension = text.includes('extend') || text.includes('expand') || text.includes('longer') || text.includes('more days') || text.includes('add');
    const isReduction = text.includes('reduce') || text.includes('cut') || text.includes('shorten') || text.includes('fewer days') || text.includes('remove');

    if (daysMatch && isExtension) {
      const targetDays = parseInt(daysMatch[1], 10);
      if (targetDays > originalDuration) {
        proposedDuration = targetDays;
        const extraDays = targetDays - originalDuration;
        const extraCost = Math.round((originalBudget / originalDuration) * 0.85 * extraDays);
        proposedBudget = originalBudget + extraCost;

        for (let d = originalDuration + 1; d <= targetDays; d++) {
          const act1 = `Day ${d} Coastal Hinterland & Nature Sanctuary Exploration`;
          const act2 = `Day ${d} Sunset Kayaking & Heritage Village Trail`;
          addedActivities.push(act1, act2);

          modifiedItinerary.push({
            day: d,
            title: `Day ${d}: Extended ${trip.destination} Hidden Gems`,
            theme: 'Wilderness & Coastal Peace',
            activities: [
              { time: '09:30 AM', title: act1, description: 'Eco-tourist guided trail and scenic photography.', location: `${trip.destination} Reserve`, estimatedCost: 600 },
              { time: '03:30 PM', title: act2, description: 'Tranquil water route and local handicraft market.', location: `${trip.destination} Backwaters`, estimatedCost: 1200 },
              { time: '07:30 PM', title: 'Farewell Riverside Dining', description: 'Candlelight dining along the backwaters.', location: 'Riverside Bistro', estimatedCost: 0 }
            ],
            meals: { breakfast: 'Resort Breakfast', lunch: 'Organic Spice Farm Lunch', dinner: 'Riverside Fresh Catch Dinner' },
            stay: `${trip.travelStyle || 'Standard'} accommodation in central ${trip.destination}`
          });
        }

        advantages.push(`Adds ${extraDays} more day(s) for leisurely exploration without daily rushing.`);
        advantages.push('Includes off-the-beaten-path hinterlands and authentic coastal dining.');
        disadvantages.push(`Requires additional total budget of ₹${extraCost.toLocaleString('en-IN')}.`);
      }
    } else if (text.includes('remove one day') || text.includes('cut 1 day') || (daysMatch && isReduction)) {
      const targetDays = daysMatch ? parseInt(daysMatch[1], 10) : Math.max(1, originalDuration - 1);
      if (targetDays < originalDuration) {
        proposedDuration = targetDays;
        const savedDays = originalDuration - targetDays;
        const savedCost = Math.round((originalBudget / originalDuration) * 0.75 * savedDays);
        proposedBudget = originalBudget - savedCost;

        const removed = modifiedItinerary.slice(targetDays);
        removed.forEach(day => {
          (day.activities || []).forEach(a => removedActivities.push(`Day ${day.day}: ${a.title}`));
        });
        modifiedItinerary = modifiedItinerary.slice(0, targetDays);

        advantages.push(`Saves ₹${savedCost.toLocaleString('en-IN')} in total lodging and daily transit.`);
        advantages.push('Concentrates schedule onto highest-priority landmarks.');
        disadvantages.push(`Removes ${removedActivities.length} scheduled activities from final day(s).`);
        warnings.push('More compressed pacing required on Day 1 & Day 2.');
      }
    }

    // Case 2: Budget changes (e.g. "reduce budget to 10000 per person")
    const budgetCutMatch = text.match(/(?:reduce|cut|budget to)\s*(?:₹)?\s*(\d+)(?:\s*k)?/i);
    if (text.includes('budget') && budgetCutMatch) {
      let targetAmount = parseInt(budgetCutMatch[1], 10);
      if (text.includes('k') && targetAmount < 500) targetAmount *= 1000;
      if (text.includes('per person')) targetAmount *= proposedTravelers;

      if (targetAmount < originalBudget) {
        proposedBudget = targetAmount;
        disadvantages.push(`Requires reducing accommodation grade to budget guesthouses.`);
        advantages.push(`Total savings of ₹${(originalBudget - proposedBudget).toLocaleString('en-IN')} achieved.`);
        warnings.push('Stricter daily meal and local transit allocations required.');
        if (proposedBudget < originalBudget * 0.6) {
          feasibility = 'challenging';
          feasibilityScore = 68;
        }
      }
    }

    // Case 3: Weather contingency ("what if it rains on Day 2")
    if (text.includes('rain') || text.includes('weather') || text.includes('storm')) {
      const dayTarget = text.includes('day 1') ? 1 : text.includes('day 3') ? 3 : text.includes('day 4') ? 4 : 2;
      const targetDayObj = modifiedItinerary.find(d => d.day === dayTarget);
      if (targetDayObj) {
        targetDayObj.theme = 'Indoor Culture & Heritage Haven (Rain-Safe Contingency)';
        targetDayObj.activities = [
          { time: '10:00 AM', title: 'State Archaeological Museum & Art Gallery', description: 'Explore indoor cultural artifacts, rare coins, and maritime exhibits safely sheltered from rainfall.', location: 'State Cultural Museum', estimatedCost: 150 },
          { time: '02:30 PM', title: 'Artisanal Cafe & Indoor Board Game Lounge', description: 'Sample artisanal teas, local baked delicacies, and relax in warm indoor setting.', location: 'Heritage Cafe', estimatedCost: 400 },
          { time: '06:30 PM', title: 'Indoor Spice Market & Covered Shopping Arcade', description: 'Shop for premium spices, cashews, and handicrafts in covered sheltered arcades.', location: 'Municipal Covered Market', estimatedCost: 0 }
        ];
        addedActivities.push(`Rain-Safe Indoor Museum & Heritage Gallery (Day ${dayTarget})`);
        addedActivities.push(`Covered Artisan Market Trail (Day ${dayTarget})`);
        advantages.push(`Protects Day ${dayTarget} from wet-weather disruptions with zero outdoor washout.`);
        advantages.push('Immerses travelers in regional history, local arts, and culinary cafes.');
        warnings.push('Outdoor beach strolls and water activities deferred.');
      }
    }

    // Case 4: Group size changes ("add two more friends")
    const friendsMatch = text.match(/add\s*(\d+)\s*(?:more\s*)?(?:friends?|travelers?|people)/i);
    if (friendsMatch) {
      const extraFriends = parseInt(friendsMatch[1], 10);
      proposedTravelers = originalTravelers + extraFriends;
      const extraBudget = Math.round((originalBudget / originalTravelers) * 0.75 * extraFriends);
      proposedBudget = originalBudget + extraBudget;
      advantages.push(`Sharing 4-person villas and private cab hire reduces per-person accommodation cost.`);
      advantages.push(`Group size increased from ${originalTravelers} to ${proposedTravelers}.`);
      disadvantages.push(`Requires multi-room villa bookings and advance group reservations.`);
    }

    // Case 5: Transport changes (train to flight / flight to train)
    if (text.includes('flight') && !text.includes('train to flight')) {
      transportChanges = 'Upgraded to direct domestic flight';
      proposedBudget += 4000 * proposedTravelers;
      advantages.push('Saves 8+ hours of transit time; maximizes destination hours.');
      disadvantages.push('Adds flight booking surcharge.');
    } else if (text.includes('train')) {
      transportChanges = 'Switched to scenic AC Express Train';
      proposedBudget = Math.max(1000, proposedBudget - 2500 * proposedTravelers);
      advantages.push('Saves transit budget and provides scenic countryside rail views.');
      disadvantages.push('Adds 4-6 hours to journey time.');
    }

    if (advantages.length === 0) {
      advantages.push('Explores alternative options with full clarity on cost and time implications.');
    }
    if (disadvantages.length === 0) {
      disadvantages.push('Minor adjustments needed in booking timeline.');
    }

    const budgetBreakdown = this.computeProportionalBreakdown(proposedBudget);
    const costPerPerson = Math.round(proposedBudget / Math.max(1, proposedTravelers));

    return {
      name: scenarioName || `Simulation: ${query.slice(0, 35)}`,
      scenarioQuery: query,
      changes: {
        duration: { original: originalDuration, proposed: proposedDuration },
        travelers: { original: originalTravelers, proposed: proposedTravelers },
        transport: transportChanges || 'Same transport mode',
        notes: query
      },
      originalBudget,
      proposedBudget,
      costDifference: proposedBudget - originalBudget,
      costPerPerson,
      originalDuration,
      proposedDuration,
      transportChanges,
      addedActivities,
      removedActivities,
      itinerary: modifiedItinerary,
      budgetBreakdown,
      warnings,
      advantages,
      disadvantages,
      feasibility,
      feasibilityScore
    };
  }

  computeProportionalBreakdown(total) {
    const transportation = Math.round(total * 0.25);
    const accommodation = Math.round(total * 0.35);
    const food = Math.round(total * 0.20);
    const activities = Math.round(total * 0.12);
    const shopping = Math.round(total * 0.04);
    const localTransport = Math.round(total * 0.04);
    const emergency = Math.round(total * 0.00);
    const miscellaneous = total - (transportation + accommodation + food + activities + shopping + localTransport + emergency);

    return {
      transportation,
      accommodation,
      food,
      activities,
      shopping,
      localTransport,
      emergency,
      miscellaneous,
      totalEstimated: total
    };
  }
}

module.exports = new ScenarioSimulator();

