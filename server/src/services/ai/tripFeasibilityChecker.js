/**
 * AI Trip Feasibility Checker
 * Evaluates generated travel itineraries on:
 * 1. Total available time & day pacing
 * 2. Activity durations & overlapping schedules
 * 3. Travel distance & estimated transportation buffers
 * 4. Budget limitations & category overrun risk
 * 5. Verified attraction opening hours & daylight constraints
 * 6. User travel style & preferences alignment
 */

class TripFeasibilityChecker {
  /**
   * Evaluates a complete trip itinerary and returns a structured report
   */
  checkTripFeasibility(trip) {
    if (!trip || !Array.isArray(trip.itinerary) || trip.itinerary.length === 0) {
      return {
        overallScore: 50,
        status: 'INCOMPLETE_DATA',
        rating: 'Needs Schedule Optimization',
        summary: 'Itinerary does not contain sufficient day schedules to evaluate feasibility.',
        metrics: {
          pacingScore: 50,
          transitFeasibility: 50,
          budgetHealth: 50,
          preferenceMatch: 50
        },
        issues: [],
        recommendations: ['Generate a complete day-wise itinerary to enable full feasibility checking.'],
        dayAnalysis: []
      };
    }

    const issues = [];
    const dayAnalysis = [];

    // 1. Analyze Day-wise pacing, timing, travel buffers & attraction hours
    trip.itinerary.forEach((daySchedule) => {
      const dayResult = this.analyzeDaySchedule(daySchedule, trip);
      dayAnalysis.push(dayResult);
      if (dayResult.issues && dayResult.issues.length > 0) {
        issues.push(...dayResult.issues);
      }
    });

    // 2. Analyze Trip-level Budget Health & Overrun risk
    const budgetIssues = this.analyzeBudgetHealth(trip);
    if (budgetIssues.length > 0) {
      issues.push(...budgetIssues);
    }

    // 3. Analyze Overall Preferences Alignment
    const preferenceIssues = this.analyzePreferencesAlignment(trip);
    if (preferenceIssues.length > 0) {
      issues.push(...preferenceIssues);
    }

    // 4. Calculate Scores
    const { overallScore, metrics, rating } = this.computeScores(issues, dayAnalysis, trip);

    // 5. Generate High-Level Summary & Recommendations
    const summary = this.generateExecutiveSummary(overallScore, issues, trip);
    const recommendations = this.generateActionableRecommendations(issues, trip);

    return {
      overallScore,
      rating,
      summary,
      metrics,
      issuesCount: issues.length,
      highSeverityCount: issues.filter((i) => i.severity === 'high').length,
      mediumSeverityCount: issues.filter((i) => i.severity === 'medium').length,
      issues,
      recommendations,
      dayAnalysis,
      checkedAt: new Date().toISOString(),
      disclaimer: 'Transit times and opening windows are verified approximations based on standard travel patterns; real-time traffic, seasonal hours, and public holidays may cause variations.'
    };
  }

  /**
   * Analyzes an individual day schedule
   */
  analyzeDaySchedule(daySchedule, trip) {
    const day = daySchedule.day;
    const activities = Array.isArray(daySchedule.activities) ? daySchedule.activities : [];
    const dayIssues = [];

    let totalActivityDurationMins = 0;
    let totalTransitMins = 0;
    let previousEndMinutes = null;
    let previousLocation = null;

    // Check excessive activities
    if (activities.length > 3) {
      dayIssues.push({
        id: `excessive-activities-d${day}`,
        type: 'EXCESSIVE_ACTIVITIES',
        severity: activities.length >= 5 ? 'high' : 'medium',
        day,
        title: `Day ${day}: Excessive Activities (${activities.length} scheduled)`,
        description: `Scheduling ${activities.length} distinct activities in a single day leaves minimal breathing room and risks traveler exhaustion.`,
        recommendation: `Trim to 2–3 curated highlights per day to ensure comfortable pacing.`,
        autoFixAction: { type: 'PRUNE_EXCESSIVE_ACTIVITIES', day, targetCount: 3 }
      });
    }

    activities.forEach((act, actIdx) => {
      const startMinutes = this.parseTimeToMinutes(act.time, actIdx);
      const estimatedDuration = this.estimateActivityDurationMinutes(act);
      totalActivityDurationMins += estimatedDuration;

      // 1. Check Attraction Opening Hours & Daylight Constraints
      const hourConflict = this.checkOpeningHoursConflict(act, startMinutes, day);
      if (hourConflict) {
        dayIssues.push(hourConflict);
      }

      // 2. Check Transit Time & Buffers between consecutive activities
      if (previousEndMinutes !== null) {
        const gapBetween = startMinutes - previousEndMinutes;
        const requiredTransit = this.estimateTransitMinutes(previousLocation, act.location);
        totalTransitMins += requiredTransit;

        if (gapBetween < requiredTransit) {
          const transitDeficit = requiredTransit - gapBetween;
          dayIssues.push({
            id: `insufficient-transit-d${day}-act${actIdx}`,
            type: 'INSUFFICIENT_TRAVEL_TIME',
            severity: transitDeficit > 30 ? 'high' : 'medium',
            day,
            activityIndex: actIdx,
            title: `Day ${day}: Insufficient Transit Buffer before "${act.title}"`,
            description: `Only ${Math.max(0, gapBetween)} mins allocated between activities, but estimated travel from "${previousLocation || 'previous venue'}" to "${act.location || 'next venue'}" requires approx ${requiredTransit} mins.`,
            recommendation: `Add a ${requiredTransit}-minute travel buffer or adjust start time to ${this.formatMinutesToTime(previousEndMinutes + requiredTransit)}.`,
            autoFixAction: {
              type: 'RESCHEDULE_ACTIVITY',
              day,
              activityIndex: actIdx,
              suggestedStartMinutes: previousEndMinutes + requiredTransit,
              suggestedTime: this.formatMinutesToTime(previousEndMinutes + requiredTransit)
            }
          });
        }
      }

      previousEndMinutes = startMinutes + estimatedDuration;
      previousLocation = act.location;
    });

    // Check total active hours for the day
    const totalDayTimeMins = totalActivityDurationMins + totalTransitMins + 120; // +120m for lunch/dinner meals
    const totalActiveHours = Math.round((totalDayTimeMins / 60) * 10) / 10;

    if (totalActiveHours > 10.5) {
      dayIssues.push({
        id: `unrealistic-schedule-d${day}`,
        type: 'UNREALISTIC_SCHEDULE',
        severity: totalActiveHours > 12 ? 'high' : 'medium',
        day,
        title: `Day ${day}: Over-Packed Day Schedule (${totalActiveHours} Active Hours)`,
        description: `Total estimated active time including visits, dining, and transit exceeds ${totalActiveHours} hours, leaving little flexibility for delays.`,
        recommendation: `Allow a 90-minute afternoon rest or simplify the day's itinerary to around 7–8 active hours.`,
        autoFixAction: { type: 'REDUCE_DAY_INTENSITY', day }
      });
    }

    const pacingRating = totalActiveHours <= 8 ? 'Comfortable' : totalActiveHours <= 10 ? 'Moderate' : 'Strenuous';

    return {
      day,
      title: daySchedule.title || `Day ${day}`,
      activitiesCount: activities.length,
      estimatedActiveHours: totalActiveHours,
      estimatedTransitMinutes: totalTransitMins,
      pacingRating,
      issues: dayIssues
    };
  }

  /**
   * Verifies attraction opening hours against standard operational windows
   */
  checkOpeningHoursConflict(activity, startMinutes, day) {
    const text = `${activity.title || ''} ${activity.description || ''} ${activity.location || ''}`.toLowerCase();

    // Monuments / Forts / Palaces / Museums typically close around 5:30 PM (17:30 = 1050 mins)
    const isHeritageOrMuseum =
      text.includes('fort') ||
      text.includes('palace') ||
      text.includes('museum') ||
      text.includes('monument') ||
      text.includes('heritage') ||
      text.includes('tomb') ||
      text.includes('mahal');

    if (isHeritageOrMuseum && startMinutes >= 1080) { // 6:00 PM or later
      return {
        id: `hours-conflict-d${day}-${activity.title?.slice(0, 15).replace(/\s+/g, '-')}`,
        type: 'SCHEDULING_CONFLICT',
        severity: 'high',
        day,
        title: `Day ${day}: Evening Conflict for "${activity.title}"`,
        description: `Most forts, palaces, and heritage museums close by 5:30 PM (sunset). Scheduling at ${activity.time} risks reaching after ticket counters have closed.`,
        recommendation: `Reschedule this heritage visit to the morning (10:00 AM) or afternoon (02:30 PM).`,
        autoFixAction: {
          type: 'MOVE_TO_DAYLIGHT',
          day,
          suggestedTime: '10:30 AM'
        }
      };
    }

    // Water Sports / Scuba / Coastal boats cease at sunset (around 5:30 PM) for maritime safety
    const isWaterSport =
      text.includes('water sport') ||
      text.includes('parasailing') ||
      text.includes('scuba') ||
      text.includes('snorkeling') ||
      text.includes('jet ski') ||
      text.includes('boat ride');

    if (isWaterSport && startMinutes >= 1080) { // 6:00 PM or later
      return {
        id: `watersport-conflict-d${day}`,
        type: 'SCHEDULING_CONFLICT',
        severity: 'high',
        day,
        title: `Day ${day}: Late Scheduling for Water Sports ("${activity.title}")`,
        description: `Coastal and maritime safety rules mandate water sports activities cease around 5:30 PM (sunset).`,
        recommendation: `Shift water sports to morning (09:30 AM - 12:00 PM) or early afternoon (02:30 PM).`,
        autoFixAction: {
          type: 'MOVE_TO_DAYLIGHT',
          day,
          suggestedTime: '10:00 AM'
        }
      };
    }

    // Night markets or clubs scheduled too early (e.g. morning 10:00 AM)
    const isNightlifeOrEvening =
      text.includes('night market') ||
      text.includes('nightclub') ||
      text.includes('pub crawl') ||
      text.includes('sunset point') ||
      text.includes('sunset stroll');

    if (isNightlifeOrEvening && startMinutes < 960) { // Before 4:00 PM
      return {
        id: `nightlife-early-d${day}`,
        type: 'SCHEDULING_CONFLICT',
        severity: 'medium',
        day,
        title: `Day ${day}: Evening Venue Scheduled Early ("${activity.title}")`,
        description: `Evening promenades, sunset points, and night markets only become active after 5:30 PM. Scheduled at ${activity.time}.`,
        recommendation: `Move to the evening slot (06:30 PM – 08:00 PM) for the authentic experience.`,
        autoFixAction: {
          type: 'MOVE_TO_EVENING',
          day,
          suggestedTime: '06:30 PM'
        }
      };
    }

    return null;
  }

  /**
   * Evaluates Budget limitations and potential overrun risks
   */
  analyzeBudgetHealth(trip) {
    const issues = [];
    const totalBudget = trip.totalBudget || 0;
    const durationDays = trip.durationDays || trip.itinerary?.length || 1;
    const travelersCount = Math.max(1, trip.travelersCount || 1);
    const perPerson = Math.round(totalBudget / travelersCount);
    const dailyPerPerson = Math.round(perPerson / durationDays);

    // Sum estimated costs across all activities
    let totalActivityEstimatedCosts = 0;
    if (Array.isArray(trip.itinerary)) {
      trip.itinerary.forEach((day) => {
        if (Array.isArray(day.activities)) {
          day.activities.forEach((act) => {
            totalActivityEstimatedCosts += Math.max(0, parseInt(act.estimatedCost, 10) || 0);
          });
        }
      });
    }

    const budgetBreakdown = trip.budgetBreakdown || {};
    const activitiesBudget = budgetBreakdown.activities || Math.round(totalBudget * 0.12);

    // Activity ticket overrun
    if (totalActivityEstimatedCosts > activitiesBudget * 1.25 && totalActivityEstimatedCosts > 2000) {
      issues.push({
        id: 'budget-activities-overrun',
        type: 'BUDGET_OVERRUN',
        severity: 'medium',
        title: 'Activity Entry Fees Exceed Allocated Activities Budget',
        description: `Sum of scheduled activity tickets and entry fees is ₹${totalActivityEstimatedCosts.toLocaleString('en-IN')}, which exceeds the allocated activities budget of ₹${activitiesBudget.toLocaleString('en-IN')}.`,
        recommendation: `Reallocate funds from miscellaneous reserves or select free public sights (promenades, beach walks, temples) on 1–2 days.`,
        autoFixAction: {
          type: 'REBALANCE_BUDGET_ACTIVITIES',
          requiredActivitiesBudget: totalActivityEstimatedCosts
        }
      });
    }

    // Daily budget vs Travel Style
    if (trip.travelStyle === 'Luxury' && dailyPerPerson < 3500) {
      issues.push({
        id: 'budget-luxury-mismatch',
        type: 'BUDGET_OVERRUN',
        severity: 'medium',
        title: 'Budget Too Constrained for Luxury Travel Style',
        description: `Estimated daily budget of ₹${dailyPerPerson.toLocaleString('en-IN')} per person is tight for 4/5-star accommodation, private transfers, and upscale dining.`,
        recommendation: `Switch travel style to "Standard" or increase total budget to approx ₹${(3500 * durationDays * travelersCount).toLocaleString('en-IN')}.`,
        autoFixAction: { type: 'ADJUST_TRAVEL_STYLE', targetStyle: 'Standard' }
      });
    } else if (trip.travelStyle === 'Budget' && dailyPerPerson < 900) {
      issues.push({
        id: 'budget-extreme-tight',
        type: 'BUDGET_OVERRUN',
        severity: 'high',
        title: 'Daily Budget is Critically Constrained',
        description: `₹${dailyPerPerson.toLocaleString('en-IN')} per person per day is barely sufficient to cover intercity transit, accommodation, and 3 daily meals.`,
        recommendation: `Increase budget by ₹${Math.round(400 * durationDays * travelersCount).toLocaleString('en-IN')} to establish a contingency buffer.`,
        autoFixAction: { type: 'BOOST_CONTINGENCY_BUDGET' }
      });
    }

    return issues;
  }

  /**
   * Analyzes alignment with user interests and stated preferences
   */
  analyzePreferencesAlignment(trip) {
    const issues = [];
    const interests = Array.isArray(trip.interests) ? trip.interests : [];
    const preferencesText = (trip.additionalPreferences || '').toLowerCase();

    // If user asked for relaxed / relaxation, but itinerary has intense pacing
    const wantsRelaxation = interests.includes('Relaxation') || preferencesText.includes('relax') || preferencesText.includes('slow');
    if (wantsRelaxation) {
      let overpackedDays = 0;
      trip.itinerary.forEach((d) => {
        if (d.activities && d.activities.length >= 3) overpackedDays++;
      });

      if (overpackedDays >= Math.ceil(trip.itinerary.length / 2)) {
        issues.push({
          id: 'preference-relaxation-mismatch',
          type: 'UNREALISTIC_SCHEDULE',
          severity: 'low',
          title: 'Schedule Pacing Clashes with "Relaxation" Goal',
          description: `You selected Relaxation, but ${overpackedDays} of ${trip.itinerary.length} days have packed schedules with 3 distinct daily venues.`,
          recommendation: `Add dedicated leisure afternoons or cafe relaxation sessions.`,
          autoFixAction: { type: 'INJECT_LEISURE_AFTERNOONS' }
        });
      }
    }

    return issues;
  }

  /**
   * Calculates overall feasibility score and dimension sub-scores
   */
  computeScores(issues, dayAnalysis, trip) {
    let pacingScore = 100;
    let transitFeasibility = 100;
    let budgetHealth = 100;
    let preferenceMatch = 100;

    issues.forEach((issue) => {
      const penalty = issue.severity === 'high' ? 18 : issue.severity === 'medium' ? 10 : 5;

      switch (issue.type) {
        case 'UNREALISTIC_SCHEDULE':
        case 'EXCESSIVE_ACTIVITIES':
          pacingScore = Math.max(30, pacingScore - penalty);
          break;
        case 'INSUFFICIENT_TRAVEL_TIME':
        case 'SCHEDULING_CONFLICT':
          transitFeasibility = Math.max(25, transitFeasibility - penalty);
          break;
        case 'BUDGET_OVERRUN':
          budgetHealth = Math.max(35, budgetHealth - penalty);
          break;
        default:
          preferenceMatch = Math.max(40, preferenceMatch - penalty);
      }
    });

    const overallScore = Math.round(
      pacingScore * 0.35 +
      transitFeasibility * 0.30 +
      budgetHealth * 0.20 +
      preferenceMatch * 0.15
    );

    let rating = 'Highly Feasible';
    if (overallScore < 70) {
      rating = 'Needs Schedule Optimization';
    } else if (overallScore < 85) {
      rating = 'Feasible with Minor Adjustments';
    }

    return {
      overallScore: Math.min(100, Math.max(20, overallScore)),
      rating,
      metrics: {
        pacingScore,
        transitFeasibility,
        budgetHealth,
        preferenceMatch
      }
    };
  }

  /**
   * Generates a concise human-readable summary
   */
  generateExecutiveSummary(overallScore, issues, trip) {
    const totalDays = trip.itinerary?.length || 5;
    const dest = trip.destination || 'destination';

    if (issues.length === 0) {
      return `The ${totalDays}-day itinerary for ${dest} is well-paced and highly feasible. Activity durations, transportation buffers, and estimated budgets are properly aligned with realistic travel expectations.`;
    }

    const highCount = issues.filter((i) => i.severity === 'high').length;
    if (highCount > 0) {
      return `The itinerary for ${dest} contains ${highCount} high-priority scheduling or transit constraints that need adjustment (e.g. closing hours or tight transit gaps) to prevent on-the-ground disruptions.`;
    }

    return `The itinerary for ${dest} is workable with ${issues.length} suggested pacing or budget enhancements to optimize comfort and transit buffers.`;
  }

  /**
   * Generates actionable suggestions list
   */
  generateActionableRecommendations(issues, trip) {
    const recs = [];

    const hasTransitIssue = issues.some((i) => i.type === 'INSUFFICIENT_TRAVEL_TIME');
    if (hasTransitIssue) {
      recs.push('Allow at least 45 minutes of transit buffer between attractions in different neighborhoods.');
    }

    const hasClosingIssue = issues.some((i) => i.type === 'SCHEDULING_CONFLICT');
    if (hasClosingIssue) {
      recs.push('Schedule historical monuments, forts, and outdoor water sports between 10:00 AM and 5:00 PM.');
    }

    const hasExcessiveIssue = issues.some((i) => i.type === 'EXCESSIVE_ACTIVITIES' || i.type === 'UNREALISTIC_SCHEDULE');
    if (hasExcessiveIssue) {
      recs.push('Limit daily schedules to 2–3 core destinations to ensure enjoyable, unhurried exploration.');
    }

    const hasBudgetIssue = issues.some((i) => i.type === 'BUDGET_OVERRUN');
    if (hasBudgetIssue) {
      recs.push('Ensure miscellaneous contingency reserves cover unforeseen auto-rickshaw or taxi surge pricing.');
    }

    if (recs.length === 0) {
      recs.push('Keep digital copies of photo IDs and hotel vouchers downloaded for offline access.');
      recs.push('Check local weather forecasts 24 hours prior to scheduled outdoor activities.');
    }

    return recs;
  }

  /**
   * Applies suggested improvements to the trip and regenerates affected schedule sections
   */
  applyFeasibilityImprovements(trip, options = {}) {
    const updatedItinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    const targetIssueId = options.issueId || 'ALL';

    updatedItinerary.forEach((daySchedule) => {
      const day = daySchedule.day;
      const activities = daySchedule.activities || [];

      // Stagger timings cleanly: Morning ~09:30 AM, Afternoon ~02:30 PM, Evening ~07:00 PM
      const standardSlots = ['09:30 AM', '02:30 PM', '07:00 PM', '09:00 PM'];

      activities.forEach((act, idx) => {
        const text = `${act.title || ''} ${act.description || ''}`.toLowerCase();

        // 1. Shift Heritage / Forts to daylight morning or afternoon
        const isHeritage = text.includes('fort') || text.includes('palace') || text.includes('museum') || text.includes('monument');
        if (isHeritage && (act.time.includes('07:') || act.time.includes('08:') || act.time.includes('PM'))) {
          const currentMins = this.parseTimeToMinutes(act.time, idx);
          if (currentMins >= 1080) { // 6:00 PM+
            act.time = '10:00 AM';
            act.description = `${act.description} (Rescheduled to morning hours to ensure open gates and full daytime exploration).`;
          }
        }

        // 2. Shift Water Sports to morning/early afternoon
        const isWaterSport = text.includes('water sport') || text.includes('parasailing') || text.includes('scuba') || text.includes('boat');
        if (isWaterSport) {
          const currentMins = this.parseTimeToMinutes(act.time, idx);
          if (currentMins >= 1080) {
            act.time = '10:30 AM';
            act.description = `${act.description} (Scheduled in prime morning daylight for coastal maritime safety).`;
          }
        }

        // 3. Shift night markets / evening dining to 07:00 PM
        const isEveningActivity = text.includes('night market') || text.includes('evening') || text.includes('dinner') || text.includes('sunset');
        if (isEveningActivity && idx === activities.length - 1) {
          act.time = '07:00 PM';
        } else if (idx < standardSlots.length && !act.time.includes(':')) {
          act.time = standardSlots[idx];
        }
      });

      // Ensure at least 45m buffer between sequential activities if times are cramped
      for (let i = 1; i < activities.length; i++) {
        const prevTime = this.parseTimeToMinutes(activities[i - 1].time, i - 1);
        const currTime = this.parseTimeToMinutes(activities[i].time, i);
        if (currTime - prevTime < 90) { // less than 1.5 hours between activities
          const newStartMins = prevTime + 150; // allow 2.5 hours total (duration + transit)
          activities[i].time = this.formatMinutesToTime(newStartMins);
        }
      }
    });

    // Rebalance budget breakdown if overrun was present
    const updatedBudget = { ...(trip.budgetBreakdown || {}) };
    let totalActivityCosts = 0;
    updatedItinerary.forEach((d) => {
      d.activities?.forEach((a) => {
        totalActivityCosts += parseInt(a.estimatedCost, 10) || 0;
      });
    });

    if (totalActivityCosts > (updatedBudget.activities || 0)) {
      const difference = totalActivityCosts - (updatedBudget.activities || 0);
      updatedBudget.activities = totalActivityCosts;
      if (updatedBudget.miscellaneous && updatedBudget.miscellaneous > difference) {
        updatedBudget.miscellaneous -= difference;
      }
      updatedBudget.totalEstimated = (updatedBudget.transportation || 0) +
        (updatedBudget.accommodation || 0) +
        (updatedBudget.food || 0) +
        updatedBudget.activities +
        (updatedBudget.miscellaneous || 0);
    }

    return {
      itinerary: updatedItinerary,
      budgetBreakdown: updatedBudget
    };
  }

  // Helper: parse string time to minutes from midnight
  parseTimeToMinutes(timeStr = '', defaultIndex = 0) {
    if (!timeStr || typeof timeStr !== 'string') {
      return defaultIndex === 0 ? 570 : defaultIndex === 1 ? 870 : 1140;
    }

    const clean = timeStr.trim().toUpperCase();

    // Generic words
    if (clean.includes('MORNING')) return 570; // 09:30 AM
    if (clean.includes('AFTERNOON')) return 870; // 02:30 PM
    if (clean.includes('EVENING') || clean.includes('NIGHT')) return 1140; // 07:00 PM

    const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridian = match[3];

      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    }

    return defaultIndex === 0 ? 570 : defaultIndex === 1 ? 870 : 1140;
  }

  // Helper: format minutes from midnight to readable string
  formatMinutesToTime(totalMins) {
    const normalized = Math.max(0, Math.min(1439, totalMins));
    let hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    const meridian = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;

    return `${formattedHours}:${formattedMins} ${meridian}`;
  }

  // Helper: estimate activity duration in minutes
  estimateActivityDurationMinutes(activity) {
    const text = `${activity.title || ''} ${activity.description || ''}`.toLowerCase();

    if (text.includes('fort') || text.includes('palace') || text.includes('museum') || text.includes('safari') || text.includes('trek')) {
      return 150; // 2.5 hours
    }
    if (text.includes('water sport') || text.includes('scuba') || text.includes('adventure')) {
      return 150; // 2.5 hours
    }
    if (text.includes('market') || text.includes('bazaar') || text.includes('shopping') || text.includes('promenade')) {
      return 105; // 1.75 hours
    }
    if (text.includes('temple') || text.includes('beach stroll') || text.includes('viewpoint') || text.includes('sunset')) {
      return 75; // 1.25 hours
    }
    return 90; // default 1.5 hours
  }

  // Helper: estimate transit minutes between two locations
  estimateTransitMinutes(loc1, loc2) {
    if (!loc1 || !loc2) return 25; // default urban transition
    const l1 = loc1.toLowerCase().trim();
    const l2 = loc2.toLowerCase().trim();

    if (l1 === l2) return 15;

    // Distant cross-region indicators
    const isDistant =
      (l1.includes('north') && l2.includes('south')) ||
      (l1.includes('south') && l2.includes('north')) ||
      (l1.includes('airport') || l2.includes('airport')) ||
      (l1.includes('outskirts') || l2.includes('outskirts'));

    if (isDistant) return 60; // 1 hour for cross-region transit

    return 35; // typical intra-city transit in moderate traffic
  }
}

module.exports = new TripFeasibilityChecker();

