const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class BudgetOptimizer {
  /**
   * Main entry point: Optimize budget for a trip
   */
  async optimizeBudget({ trip, targetBudget, preferredTradeoffs = [] }) {
    if (!trip) throw new Error('Trip is required for budget optimization.');

    const totalBudget = targetBudget ? Math.max(1000, parseInt(targetBudget, 10)) : (trip.totalBudget || 30000);
    const travelersCount = Math.max(1, trip.travelersCount || 1);
    const currentBreakdown = trip.budgetBreakdown || {};

    // 8 standard budget categories
    const categories = {
      transportation: currentBreakdown.transportation || Math.round(totalBudget * 0.25),
      accommodation: currentBreakdown.accommodation || Math.round(totalBudget * 0.35),
      food: currentBreakdown.food || Math.round(totalBudget * 0.20),
      activities: currentBreakdown.activities || Math.round(totalBudget * 0.12),
      shopping: currentBreakdown.shopping || Math.round(totalBudget * 0.04),
      localTransport: currentBreakdown.localTransport || Math.round(totalBudget * 0.04),
      emergency: currentBreakdown.emergency || Math.round(totalBudget * 0.05),
      miscellaneous: currentBreakdown.miscellaneous || 0
    };

    const estimatedSpending = Object.values(categories).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const remainingBudget = totalBudget - estimatedSpending;
    const costPerPerson = Math.round(estimatedSpending / travelersCount);
    const utilizationPercentage = Math.min(150, Math.round((estimatedSpending / totalBudget) * 100));

    let spendingStatus = 'OPTIMAL';
    if (estimatedSpending > totalBudget * 1.05) {
      spendingStatus = 'OVERSPENT';
    } else if (estimatedSpending < totalBudget * 0.85) {
      spendingStatus = 'UNDERSPENT';
    }

    const overspendingAlerts = [];
    if (categories.accommodation > totalBudget * 0.40) {
      overspendingAlerts.push({
        category: 'Accommodation',
        amount: Math.round(categories.accommodation - totalBudget * 0.35),
        severity: 'high',
        reason: 'Accommodation accounts for over 40% of the entire budget.'
      });
    }
    if (categories.transportation > totalBudget * 0.35) {
      overspendingAlerts.push({
        category: 'Transportation',
        amount: Math.round(categories.transportation - totalBudget * 0.25),
        severity: 'medium',
        reason: 'Intercity travel / private vehicle hire is consuming more than 35% of funds.'
      });
    }
    if (estimatedSpending > totalBudget) {
      overspendingAlerts.push({
        category: 'Total Trip',
        amount: estimatedSpending - totalBudget,
        severity: 'high',
        reason: `Total estimated expenses exceed current financial limit by ₹${(estimatedSpending - totalBudget).toLocaleString('en-IN')}.`
      });
    }

    const activeProvider = aiProvider.getActiveProvider();
    if (activeProvider !== 'demo') {
      try {
        const prompt = `Analyze this trip budget for "${trip.name || trip.destination}" (${trip.durationDays || 5} days, ${travelersCount} travelers):
Total Budget: ₹${totalBudget}
Estimated Spending: ₹${estimatedSpending}
Categories:
- Transportation: ₹${categories.transportation}
- Accommodation: ₹${categories.accommodation}
- Food: ₹${categories.food}
- Activities: ₹${categories.activities}
- Shopping: ₹${categories.shopping}
- Local Transport: ₹${categories.localTransport}
- Emergency: ₹${categories.emergency}
- Miscellaneous: ₹${categories.miscellaneous}
Preferences: Style: ${trip.travelStyle || 'Standard'}, Trade-offs preferred: ${preferredTradeoffs.join(', ') || 'Smart savings without sacrificing comfort'}.
Provide actionable suggestions to eliminate overspending, recommend cheaper hotel/transport alternatives, and optimize costs.`;

        const messages = [
          { role: 'system', content: promptTemplates.BUDGET_OPTIMIZER },
          { role: 'user', content: prompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.3, json: true });
        const parsed = aiProvider.safeParseJson(res.content);
        if (parsed && parsed.optimizationSuggestions && Array.isArray(parsed.optimizationSuggestions)) {
          return {
            success: true,
            data: {
              ...parsed,
              totalBudget,
              costPerPerson,
              travelersCount,
              spendingStatus: parsed.spendingStatus || spendingStatus,
              overspendingAlerts: parsed.overspendingAlerts?.length ? parsed.overspendingAlerts : overspendingAlerts
            },
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[BudgetOptimizer] AI optimization failed, using intelligent fallback:', err.message);
      }
    }

    // High quality intelligent fallback calculation & suggestions
    const suggestions = this.generateFallbackSuggestions(trip, categories, totalBudget);
    const projectedSavings = suggestions.reduce((sum, s) => sum + s.potentialSavings, 0);
    const optimizedTotal = Math.max(Math.round(totalBudget * 0.85), estimatedSpending - projectedSavings);

    const categoryBreakdown = {};
    for (const [key, val] of Object.entries(categories)) {
      let status = 'On Track';
      if (val > totalBudget * 0.38) status = 'Over Budget';
      else if (val < totalBudget * 0.10) status = 'Under Budget';
      categoryBreakdown[key] = {
        allocated: val,
        estimated: val,
        status
      };
    }

    return {
      success: true,
      data: {
        totalBudget,
        estimatedSpending,
        remainingBudget,
        costPerPerson,
        travelersCount,
        utilizationPercentage,
        spendingStatus,
        categoryBreakdown,
        overspendingAlerts,
        optimizationSuggestions: suggestions,
        optimizedTotalBudget: optimizedTotal,
        projectedSavings,
        summary: `Identified ₹${projectedSavings.toLocaleString('en-IN')} in potential savings across accommodation and local transport while keeping your core itinerary intact.`
      },
      isDemoOutput: true,
      provider: 'intelligent-local-optimizer'
    };
  }

  generateFallbackSuggestions(trip, categories, totalBudget) {
    const suggestions = [];

    if (categories.accommodation >= 10000) {
      const savings = Math.round(categories.accommodation * 0.20);
      suggestions.push({
        category: 'Accommodation',
        title: 'Switch to Certified Boutique Homestay / Heritage Villa',
        description: `Opting for verified heritage stays or boutique guesthouses reduces accommodation spend by ₹${savings.toLocaleString('en-IN')} while offering prime local location and complimentary breakfast.`,
        potentialSavings: savings,
        impact: 'High comfort preserved; authentic local cultural atmosphere.'
      });
    }

    if (categories.transportation >= 6000) {
      const savings = Math.round(categories.transportation * 0.25);
      suggestions.push({
        category: 'Transportation',
        title: 'Advance Rail Booking & City Day Transit Pass',
        description: `Booking train / premium coach seats 2+ weeks ahead and utilizing local day transit passes yields ₹${savings.toLocaleString('en-IN')} in direct savings over on-demand private cabs.`,
        potentialSavings: savings,
        impact: 'Slightly less flexibility; dependable and scenic.'
      });
    }

    if (categories.food >= 7000) {
      const savings = Math.round(categories.food * 0.15);
      suggestions.push({
        category: 'Food',
        title: 'Curated Iconic Street Food & Coastal Thali Trails',
        description: `Enjoying authentic local food stalls and family-run diners for lunch saves ₹${savings.toLocaleString('en-IN')} compared to resort dining.`,
        potentialSavings: savings,
        impact: 'Superior authentic culinary experience.'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        category: 'General',
        title: 'Group Pass & Off-Peak Activity Booking',
        description: 'Booking museum and attraction passes online in advance avoids spot surcharge fees and grants group bundle discounts.',
        potentialSavings: 1500,
        impact: 'Zero compromise on itinerary scope.'
      });
    }

    return suggestions;
  }
}

module.exports = new BudgetOptimizer();

