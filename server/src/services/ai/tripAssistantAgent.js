const aiProvider = require('./aiProvider');

/**
 * Context-Aware AI Trip Assistant
 * Understands currently selected saved trip and its full itinerary context.
 * Supports natural-language commands to:
 * 1. Add activities
 * 2. Remove activities
 * 3. Replace attractions
 * 4. Modify timings
 * 5. Change travel dates
 * 6. Adjust budget
 * 7. Change travel preferences
 *
 * Rules:
 * - Only modifies affected itinerary sections.
 * - Preserves unaffected information (days, activities, checklists, notes).
 * - Generates structured change preview (diff, summary, impact).
 * - Does NOT update database until user approves.
 * - Recalculates related budget and travel estimates.
 */
class TripAssistantAgent {
  /**
   * Main entry point: process command and return change proposal preview
   */
  async interpretAndProposeChange(trip, userCommand) {
    if (!trip) {
      throw new Error('Trip context is required.');
    }
    if (!userCommand || !userCommand.trim()) {
      throw new Error('User command is required.');
    }

    const command = userCommand.trim();
    const plainTrip = trip.toObject ? trip.toObject() : JSON.parse(JSON.stringify(trip));

    // Try AI model first if available, otherwise rule-based NLP parser
    let aiParsed = null;
    const activeProvider = aiProvider.getActiveProvider();
    if (activeProvider !== 'demo') {
      aiParsed = await this.queryLLMForIntent(plainTrip, command);
    }

    // Determine intent and action
    const parsedIntent = aiParsed || this.ruleBasedIntentParser(plainTrip, command);

    switch (parsedIntent.actionType) {
      case 'ADD_ACTIVITY':
        return this.handleAddActivity(plainTrip, parsedIntent, command);
      case 'REMOVE_ACTIVITY':
        return this.handleRemoveActivity(plainTrip, parsedIntent, command);
      case 'REPLACE_ACTIVITY':
        return this.handleReplaceActivity(plainTrip, parsedIntent, command);
      case 'MODIFY_TIMING':
        return this.handleModifyTiming(plainTrip, parsedIntent, command);
      case 'CHANGE_DATES':
        return this.handleChangeDates(plainTrip, parsedIntent, command);
      case 'ADJUST_BUDGET':
        return this.handleAdjustBudget(plainTrip, parsedIntent, command);
      case 'CHANGE_PREFERENCES':
        return this.handleChangePreferences(plainTrip, parsedIntent, command);
      default:
        // Default fallback: treat as add activity or adjust preferences
        return this.handleAddActivity(plainTrip, parsedIntent, command);
    }
  }

  /**
   * LLM Intent Extractor for connected AI providers
   */
  async queryLLMForIntent(trip, command) {
    try {
      const tripSummary = {
        destination: trip.destination,
        startingLocation: trip.startingLocation,
        durationDays: trip.durationDays || trip.itinerary?.length || 5,
        totalBudget: trip.totalBudget,
        travelStyle: trip.travelStyle,
        interests: trip.interests,
        dates: `${trip.departureDate} to ${trip.returnDate}`,
        dayThemes: (trip.itinerary || []).map(d => `Day ${d.day}: ${d.title} (${d.activities?.map(a => a.title).join(', ')})`)
      };

      const systemPrompt = `You are a Context-Aware Trip Assistant. Analyze the user command regarding an existing trip and return ONLY a JSON object:
{
  "actionType": "ADD_ACTIVITY" | "REMOVE_ACTIVITY" | "REPLACE_ACTIVITY" | "MODIFY_TIMING" | "CHANGE_DATES" | "ADJUST_BUDGET" | "CHANGE_PREFERENCES",
  "affectedDay": 1, // integer or null if trip-wide
  "targetActivityTitle": "title or keyword of activity to remove/replace/modify",
  "newActivity": {
    "title": "Title of activity",
    "time": "Morning" | "10:00 AM" | "Afternoon" | "Evening",
    "description": "Short description",
    "location": "Location name",
    "estimatedCost": 1000
  },
  "newTiming": "11:00 AM",
  "newDates": {
    "departureDate": "YYYY-MM-DD",
    "returnDate": "YYYY-MM-DD"
  },
  "newBudget": 50000,
  "newPreferences": {
    "travelStyle": "Luxury",
    "interests": ["Beaches", "Food"],
    "additionalPreferences": "Vegetarian only"
  },
  "summary": "Brief 1-sentence description of the change"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current Trip Context:\n${JSON.stringify(tripSummary, null, 2)}\n\nUser Command: "${command}"` }
      ];

      const res = await aiProvider.generateChat(messages, { temperature: 0.2 });
      const parsed = aiProvider.safeParseJson(res.content);
      if (parsed && parsed.actionType) {
        return parsed;
      }
    } catch (err) {
      // Gracefully fall back to rule-based parser on any LLM or network error
    }
    return null;
  }

  /**
   * Deterministic Natural Language Parser for all 7 intent types
   */
  ruleBasedIntentParser(trip, command) {
    const text = command.toLowerCase().trim();

    // 1. Detect Day Number (e.g. "Day 2", "Day 3", "first day", "last day")
    let affectedDay = null;
    const dayMatch = text.match(/day\s*(\d+)/i) || text.match(/d(\d+)/i);
    if (dayMatch) {
      affectedDay = parseInt(dayMatch[1], 10);
    } else if (text.includes('first day') || text.includes('day one')) {
      affectedDay = 1;
    } else if (text.includes('second day') || text.includes('day two')) {
      affectedDay = 2;
    } else if (text.includes('third day') || text.includes('day three')) {
      affectedDay = 3;
    } else if (text.includes('fourth day') || text.includes('day four')) {
      affectedDay = 4;
    } else if (text.includes('fifth day') || text.includes('day five')) {
      affectedDay = 5;
    } else if (text.includes('last day') && trip.itinerary && trip.itinerary.length > 0) {
      affectedDay = trip.itinerary.length;
    }

    // 2. Action Verb Check: ADD ACTIVITY (starts with add/schedule/include/insert/append)
    if (
      text.startsWith('add ') ||
      text.startsWith('schedule ') ||
      text.startsWith('include ') ||
      text.startsWith('insert ') ||
      text.startsWith('append ')
    ) {
      const addData = this.extractAddData(command, trip, affectedDay);
      return {
        actionType: 'ADD_ACTIVITY',
        affectedDay: addData.affectedDay || affectedDay || 1,
        newActivity: addData.newActivity,
        summary: `Add "${addData.newActivity?.title || 'New Activity'}" to Day ${addData.affectedDay || affectedDay || 1}`
      };
    }

    // 3. Action Verb Check: REMOVE ACTIVITY (starts with remove/delete/drop/omit)
    if (
      text.startsWith('remove ') ||
      text.startsWith('delete ') ||
      text.startsWith('drop ') ||
      text.startsWith('cancel activity') ||
      text.startsWith('omit ')
    ) {
      const removeData = this.extractRemoveData(command, trip, affectedDay);
      return {
        actionType: 'REMOVE_ACTIVITY',
        affectedDay: removeData.affectedDay || affectedDay || 1,
        targetActivityTitle: removeData.targetTitle,
        targetIndex: removeData.targetIndex,
        summary: `Remove "${removeData.targetTitle || 'activity'}" from Day ${removeData.affectedDay || affectedDay || 1}`
      };
    }

    // 4. Action Verb Check: REPLACE ACTIVITY (replace ... with, swap ... with, substitute)
    if (
      text.startsWith('replace ') ||
      text.startsWith('swap ') ||
      text.startsWith('substitute ') ||
      text.includes(' with ') && (text.includes('replace') || text.includes('swap'))
    ) {
      const replaceData = this.extractReplaceData(command, trip, affectedDay);
      return {
        actionType: 'REPLACE_ACTIVITY',
        affectedDay: replaceData.affectedDay || affectedDay || 1,
        targetActivityTitle: replaceData.targetTitle,
        newActivity: replaceData.newActivity,
        summary: `Replace "${replaceData.targetTitle || 'activity'}" with "${replaceData.newActivity?.title || 'new attraction'}"`
      };
    }

    // 5. Intent: MODIFY_TIMING (timing, reschedule, change time, shift ... to ... AM/PM)
    if (
      text.includes('timing') ||
      text.includes('reschedule') ||
      text.includes('change timing') ||
      text.includes('activity timing') ||
      text.match(/time\s+to\s+\d{1,2}/) ||
      text.match(/shift\s+.*\s+to\s+\d{1,2}/) ||
      text.match(/to\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)/i) ||
      (text.includes('time') && (text.includes('am') || text.includes('pm') || text.includes('shift')))
    ) {
      const timingData = this.extractTimingData(command, trip, affectedDay);
      return {
        actionType: 'MODIFY_TIMING',
        affectedDay: timingData.affectedDay || affectedDay || 1,
        targetActivityTitle: timingData.targetTitle,
        newTiming: timingData.newTiming,
        newDurationHours: timingData.newDurationHours,
        summary: `Reschedule ${timingData.targetTitle || 'activity'} on Day ${timingData.affectedDay || affectedDay || 1} to ${timingData.newTiming}`
      };
    }

    // 6. Intent: CHANGE_DATES (change travel dates, postpone, shift departure, from YYYY-MM-DD to)
    if (
      text.includes('change date') ||
      text.includes('change travel date') ||
      text.includes('travel dates') ||
      text.includes('postpone') ||
      text.includes('prepone') ||
      text.includes('shift date') ||
      text.includes('reschedule trip') ||
      text.match(/\d{4}-\d{2}-\d{2}/) ||
      text.includes('departure date')
    ) {
      const dates = this.extractDatesFromCommand(command, trip);
      return {
        actionType: 'CHANGE_DATES',
        affectedDay: null,
        newDates: dates,
        summary: `Change travel dates from ${trip.departureDate ? new Date(trip.departureDate).toISOString().split('T')[0] : 'TBD'} to ${dates.departureDate}`
      };
    }

    // 7. Intent: ADJUST_BUDGET (increase budget, reduce budget, total budget to, set budget)
    if (
      text.includes('budget') ||
      text.includes('total budget') ||
      text.includes('increase budget') ||
      text.includes('reduce budget') ||
      text.includes('set budget')
    ) {
      const budgetData = this.extractBudgetData(command, trip);
      if (budgetData.newBudget) {
        return {
          actionType: 'ADJUST_BUDGET',
          affectedDay: null,
          newBudget: budgetData.newBudget,
          summary: `Adjust total budget to ₹${budgetData.newBudget.toLocaleString('en-IN')}`
        };
      }
    }

    // 8. Intent: CHANGE_PREFERENCES (travel style, luxury, preferences, vegan, vegetarian)
    if (
      text.includes('travel style') ||
      text.includes('luxury') ||
      text.includes('budget style') ||
      text.includes('standard style') ||
      text.includes('preference') ||
      text.includes('interests') ||
      text.includes('vegetarian') ||
      text.includes('kid-friendly') ||
      text.includes('vegan')
    ) {
      const prefData = this.extractPreferenceData(command, trip);
      return {
        actionType: 'CHANGE_PREFERENCES',
        affectedDay: null,
        newPreferences: prefData,
        summary: `Update trip travel style and preferences`
      };
    }

    // Fallback: check if contains remove keywords
    if (text.includes('remove') || text.includes('delete')) {
      const removeData = this.extractRemoveData(command, trip, affectedDay);
      return {
        actionType: 'REMOVE_ACTIVITY',
        affectedDay: removeData.affectedDay || affectedDay || 1,
        targetActivityTitle: removeData.targetTitle,
        targetIndex: removeData.targetIndex,
        summary: `Remove "${removeData.targetTitle || 'activity'}" from Day ${removeData.affectedDay || affectedDay || 1}`
      };
    }

    // Default fallback: ADD_ACTIVITY
    const addData = this.extractAddData(command, trip, affectedDay);
    return {
      actionType: 'ADD_ACTIVITY',
      affectedDay: addData.affectedDay || affectedDay || 1,
      newActivity: addData.newActivity,
      summary: `Add "${addData.newActivity?.title || 'New Activity'}" to Day ${addData.affectedDay || affectedDay || 1}`
    };
  }

  // ==========================================
  // ACTION HANDLERS (Generate preview diffs)
  // ==========================================

  /**
   * Action 1: ADD ACTIVITY
   */
  handleAddActivity(trip, intent, command) {
    const itinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    let targetDayNum = intent.affectedDay || 1;
    if (targetDayNum < 1 || targetDayNum > itinerary.length) {
      targetDayNum = 1;
    }

    const dayIndex = itinerary.findIndex(d => d.day === targetDayNum);
    if (dayIndex === -1) {
      throw new Error(`Day ${targetDayNum} was not found in this trip's itinerary.`);
    }

    const targetDay = itinerary[dayIndex];
    const beforeActivities = [...(targetDay.activities || [])];

    // Build new activity object
    const rawNew = intent.newActivity || {};
    const title = rawNew.title || 'Sightseeing & Local Exploration';
    const time = rawNew.time || this.getSuggestedTimeSlot(beforeActivities);
    const location = rawNew.location || trip.destination || 'Local Attraction';
    const estimatedCost = typeof rawNew.estimatedCost === 'number' && rawNew.estimatedCost >= 0
      ? rawNew.estimatedCost
      : this.estimateActivityCost(title, trip.travelStyle);
    const description = rawNew.description || `Experience ${title} at ${location}.`;

    const newActivity = {
      time,
      title,
      description,
      location,
      estimatedCost
    };

    // Insert into activities list
    const afterActivities = [...beforeActivities, newActivity];
    targetDay.activities = afterActivities;

    // Recalculate activities budget
    const budgetRecalc = this.recalculateTripBudget(trip, itinerary);

    const diff = {
      type: 'ITINERARY_ADDITION',
      day: targetDayNum,
      before: beforeActivities,
      after: afterActivities,
      addedItem: newActivity
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Added "${newActivity.title}" to Day ${targetDayNum} (${newActivity.time}).`;
    const impactSummary = `Day ${targetDayNum} now has ${afterActivities.length} activities (was ${beforeActivities.length}). Activity cost estimate adjusted by +₹${newActivity.estimatedCost.toLocaleString('en-IN')}. Other ${itinerary.length - 1} days remain untouched.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'ADD_ACTIVITY',
      affectedDay: targetDayNum,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: budgetRecalc,
      proposedChanges: {
        itinerary,
        budgetBreakdown: budgetRecalc.budgetBreakdown,
        totalBudget: budgetRecalc.totalBudget,
        budgetPerPerson: budgetRecalc.budgetPerPerson
      }
    };
  }

  /**
   * Action 2: REMOVE ACTIVITY
   */
  handleRemoveActivity(trip, intent, command) {
    const itinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    let targetDayNum = intent.affectedDay;

    // If day not specified, search across all days
    let dayIndex = -1;
    let removeActivityIndex = -1;

    if (targetDayNum) {
      dayIndex = itinerary.findIndex(d => d.day === targetDayNum);
      if (dayIndex !== -1 && intent.targetIndex !== undefined) {
        removeActivityIndex = intent.targetIndex;
      }
    }

    // Search by title or keyword if not found yet
    if (removeActivityIndex === -1 && intent.targetActivityTitle) {
      const searchTitle = intent.targetActivityTitle.toLowerCase();
      for (let d = 0; d < itinerary.length; d++) {
        if (targetDayNum && itinerary[d].day !== targetDayNum) continue;
        const actIdx = (itinerary[d].activities || []).findIndex(a =>
          a.title.toLowerCase().includes(searchTitle) ||
          (a.location && a.location.toLowerCase().includes(searchTitle))
        );
        if (actIdx !== -1) {
          dayIndex = d;
          targetDayNum = itinerary[d].day;
          removeActivityIndex = actIdx;
          break;
        }
      }
    }

    // If still not matched, take the last activity of the specified day
    if (dayIndex === -1) {
      targetDayNum = targetDayNum || 1;
      dayIndex = itinerary.findIndex(d => d.day === targetDayNum);
    }
    if (dayIndex === -1) {
      throw new Error(`Could not find target day in itinerary.`);
    }

    const targetDay = itinerary[dayIndex];
    const beforeActivities = [...(targetDay.activities || [])];

    if (beforeActivities.length === 0) {
      throw new Error(`Day ${targetDayNum} currently has no activities to remove.`);
    }

    if (removeActivityIndex < 0 || removeActivityIndex >= beforeActivities.length) {
      // Default to the first or matching item
      removeActivityIndex = beforeActivities.length - 1;
    }

    const removedItem = beforeActivities[removeActivityIndex];
    const afterActivities = beforeActivities.filter((_, idx) => idx !== removeActivityIndex);
    targetDay.activities = afterActivities;

    // Recalculate activities budget
    const budgetRecalc = this.recalculateTripBudget(trip, itinerary);

    const diff = {
      type: 'ITINERARY_REMOVAL',
      day: targetDayNum,
      before: beforeActivities,
      after: afterActivities,
      removedItem
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Removed "${removedItem.title}" from Day ${targetDayNum}.`;
    const impactSummary = `Day ${targetDayNum} activity count reduced from ${beforeActivities.length} to ${afterActivities.length}. Activity cost reduced by ₹${(removedItem.estimatedCost || 0).toLocaleString('en-IN')}. All other days remain completely intact.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'REMOVE_ACTIVITY',
      affectedDay: targetDayNum,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: budgetRecalc,
      proposedChanges: {
        itinerary,
        budgetBreakdown: budgetRecalc.budgetBreakdown,
        totalBudget: budgetRecalc.totalBudget,
        budgetPerPerson: budgetRecalc.budgetPerPerson
      }
    };
  }

  /**
   * Action 3: REPLACE ACTIVITY
   */
  handleReplaceActivity(trip, intent, command) {
    const itinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    let targetDayNum = intent.affectedDay || 1;
    let dayIndex = itinerary.findIndex(d => d.day === targetDayNum);

    // Search by title if provided
    let replaceIdx = -1;
    if (intent.targetActivityTitle) {
      const searchTitle = intent.targetActivityTitle.toLowerCase();
      for (let d = 0; d < itinerary.length; d++) {
        const found = (itinerary[d].activities || []).findIndex(a =>
          a.title.toLowerCase().includes(searchTitle) ||
          (a.location && a.location.toLowerCase().includes(searchTitle))
        );
        if (found !== -1) {
          dayIndex = d;
          targetDayNum = itinerary[d].day;
          replaceIdx = found;
          break;
        }
      }
    }

    if (dayIndex === -1) {
      dayIndex = 0;
      targetDayNum = itinerary[0]?.day || 1;
    }

    const targetDay = itinerary[dayIndex];
    const beforeActivities = [...(targetDay.activities || [])];

    if (replaceIdx === -1 || replaceIdx >= beforeActivities.length) {
      replaceIdx = 0; // default to first activity if unspecified
    }

    const oldActivity = beforeActivities[replaceIdx] || { title: 'Previous Activity', time: 'Morning' };
    const rawNew = intent.newActivity || {};

    const newActivity = {
      time: rawNew.time || oldActivity.time || 'Morning',
      title: rawNew.title || 'Alternative Attraction',
      description: rawNew.description || `Explore ${rawNew.title || 'attraction'} replacing ${oldActivity.title}.`,
      location: rawNew.location || trip.destination || 'Destination Center',
      estimatedCost: typeof rawNew.estimatedCost === 'number' && rawNew.estimatedCost >= 0
        ? rawNew.estimatedCost
        : this.estimateActivityCost(rawNew.title || 'Attraction', trip.travelStyle)
    };

    const afterActivities = beforeActivities.map((act, idx) => (idx === replaceIdx ? newActivity : act));
    targetDay.activities = afterActivities;

    const budgetRecalc = this.recalculateTripBudget(trip, itinerary);

    const diff = {
      type: 'ITINERARY_REPLACEMENT',
      day: targetDayNum,
      before: beforeActivities,
      after: afterActivities,
      replacedItem: oldActivity,
      newItem: newActivity
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Replaced "${oldActivity.title}" with "${newActivity.title}" on Day ${targetDayNum}.`;
    const costDiff = (newActivity.estimatedCost || 0) - (oldActivity.estimatedCost || 0);
    const impactSummary = `Day ${targetDayNum}: replaced ${oldActivity.title} with ${newActivity.title}. Activity budget changed by ${costDiff >= 0 ? '+' : ''}₹${costDiff.toLocaleString('en-IN')}. Other days and schedule remain unchanged.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'REPLACE_ACTIVITY',
      affectedDay: targetDayNum,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: budgetRecalc,
      proposedChanges: {
        itinerary,
        budgetBreakdown: budgetRecalc.budgetBreakdown,
        totalBudget: budgetRecalc.totalBudget,
        budgetPerPerson: budgetRecalc.budgetPerPerson
      }
    };
  }

  /**
   * Action 4: MODIFY TIMING
   */
  handleModifyTiming(trip, intent, command) {
    const itinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    let targetDayNum = intent.affectedDay || 1;
    let dayIndex = itinerary.findIndex(d => d.day === targetDayNum);

    let targetIdx = -1;
    if (intent.targetActivityTitle) {
      const searchTitle = intent.targetActivityTitle.toLowerCase();
      for (let d = 0; d < itinerary.length; d++) {
        if (targetDayNum && itinerary[d].day !== targetDayNum) continue;
        const found = (itinerary[d].activities || []).findIndex(a =>
          a.title.toLowerCase().includes(searchTitle) ||
          (a.location && a.location.toLowerCase().includes(searchTitle)) ||
          (a.time && a.time.toLowerCase().includes(searchTitle))
        );
        if (found !== -1) {
          dayIndex = d;
          targetDayNum = itinerary[d].day;
          targetIdx = found;
          break;
        }
      }
    }

    if (dayIndex === -1) {
      dayIndex = itinerary.findIndex(d => d.day === targetDayNum);
      if (dayIndex === -1) dayIndex = 0;
      targetDayNum = itinerary[dayIndex]?.day || 1;
    }

    const targetDay = itinerary[dayIndex];
    const beforeActivities = [...(targetDay.activities || [])];

    // If targetIdx is still -1, check time-of-day keywords in command
    if (targetIdx === -1) {
      const cmdLower = command.toLowerCase();
      if (cmdLower.includes('morning')) {
        const mIdx = beforeActivities.findIndex(a => (a.time || '').toLowerCase().includes('morning') || (a.time || '').toLowerCase().includes('am'));
        targetIdx = mIdx !== -1 ? mIdx : 0;
      } else if (cmdLower.includes('afternoon')) {
        const aIdx = beforeActivities.findIndex(a => (a.time || '').toLowerCase().includes('afternoon') || (a.time || '').toLowerCase().includes('pm'));
        targetIdx = aIdx !== -1 ? aIdx : (beforeActivities.length > 1 ? 1 : 0);
      } else if (cmdLower.includes('evening') || cmdLower.includes('dinner')) {
        const eIdx = beforeActivities.findIndex(a => (a.time || '').toLowerCase().includes('evening') || (a.time || '').toLowerCase().includes('night'));
        targetIdx = eIdx !== -1 ? eIdx : Math.max(0, beforeActivities.length - 1);
      } else {
        targetIdx = 0;
      }
    }

    const oldActivity = beforeActivities[targetIdx] || { title: 'Activity', time: 'Morning' };
    const newTiming = intent.newTiming || '11:00 AM';

    const updatedActivity = {
      ...oldActivity,
      time: newTiming
    };
    if (intent.newDurationHours) {
      updatedActivity.durationHours = intent.newDurationHours;
    }

    const afterActivities = beforeActivities.map((act, idx) => (idx === targetIdx ? updatedActivity : act));
    targetDay.activities = afterActivities;

    const diff = {
      type: 'TIMING_MODIFICATION',
      day: targetDayNum,
      before: beforeActivities,
      after: afterActivities,
      oldTiming: oldActivity.time,
      newTiming: newTiming,
      modifiedActivity: updatedActivity
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Shifted "${oldActivity.title}" timing to ${newTiming} on Day ${targetDayNum}.`;
    const impactSummary = `Day ${targetDayNum}: Updated time for ${oldActivity.title} from ${oldActivity.time} to ${newTiming}. All other activities, days, and budgets remain identical.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'MODIFY_TIMING',
      affectedDay: targetDayNum,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: {
        totalBudget: trip.totalBudget,
        budgetPerPerson: trip.budgetPerPerson,
        budgetBreakdown: trip.budgetBreakdown
      },
      proposedChanges: {
        itinerary
      }
    };
  }

  /**
   * Action 5: CHANGE DATES
   */
  handleChangeDates(trip, intent, command) {
    const rawDates = intent.newDates || {};
    const oldDep = trip.departureDate ? new Date(trip.departureDate) : new Date();
    const oldRet = trip.returnDate ? new Date(trip.returnDate) : new Date(oldDep.getTime() + 5 * 86400000);

    let newDep = rawDates.departureDate ? new Date(rawDates.departureDate) : null;
    let newRet = rawDates.returnDate ? new Date(rawDates.returnDate) : null;

    if (!newDep || isNaN(newDep.getTime())) {
      // If relative shift (e.g. postpone by 7 days)
      const shiftDays = rawDates.shiftDays || 7;
      newDep = new Date(oldDep.getTime() + shiftDays * 86400000);
      newRet = new Date(oldRet.getTime() + shiftDays * 86400000);
    } else if (!newRet || isNaN(newRet.getTime())) {
      const durationDays = trip.durationDays || trip.itinerary?.length || 5;
      newRet = new Date(newDep.getTime() + durationDays * 86400000);
    }

    const durationDays = Math.max(1, Math.round((newRet - newDep) / 86400000));

    // Shift day dates in the itinerary without altering any activities
    const itinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    itinerary.forEach((daySchedule, idx) => {
      const dayDate = new Date(newDep.getTime() + idx * 86400000);
      daySchedule.date = dayDate.toISOString().split('T')[0];
    });

    const diff = {
      type: 'DATES_CHANGE',
      before: {
        departureDate: oldDep.toISOString().split('T')[0],
        returnDate: oldRet.toISOString().split('T')[0],
        durationDays: trip.durationDays || 5
      },
      after: {
        departureDate: newDep.toISOString().split('T')[0],
        returnDate: newRet.toISOString().split('T')[0],
        durationDays
      }
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Shifted travel dates to ${newDep.toDateString()} – ${newRet.toDateString()}.`;
    const impactSummary = `Departure updated to ${newDep.toISOString().split('T')[0]} and return to ${newRet.toISOString().split('T')[0]} (${durationDays} days). Day schedules and all activity details are preserved intact.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'CHANGE_DATES',
      affectedDay: null,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: {
        totalBudget: trip.totalBudget,
        budgetPerPerson: trip.budgetPerPerson,
        budgetBreakdown: trip.budgetBreakdown
      },
      proposedChanges: {
        departureDate: newDep,
        returnDate: newRet,
        durationDays,
        itinerary
      }
    };
  }

  /**
   * Action 6: ADJUST BUDGET
   */
  handleAdjustBudget(trip, intent, command) {
    const oldBudget = trip.totalBudget || 30000;
    const travelersCount = Math.max(1, trip.travelersCount || 1);
    const newBudget = Math.max(1000, intent.newBudget || oldBudget);
    const newBudgetPerPerson = Math.round(newBudget / travelersCount);

    // Compute proportional breakdown based on current or standard weights
    const currentBreakdown = trip.budgetBreakdown || {};
    const transportation = Math.round(newBudget * 0.25);
    const accommodation = Math.round(newBudget * 0.35);
    const food = Math.round(newBudget * 0.20);
    const activities = currentBreakdown.activities && currentBreakdown.activities > 0
      ? Math.min(Math.round(newBudget * 0.25), currentBreakdown.activities)
      : Math.round(newBudget * 0.12);
    const miscellaneous = Math.max(0, newBudget - (transportation + accommodation + food + activities));
    const totalEstimated = transportation + accommodation + food + activities + miscellaneous;

    const updatedBreakdown = {
      transportation,
      accommodation,
      food,
      activities,
      miscellaneous,
      totalEstimated,
      budgetPerPerson: newBudgetPerPerson,
      isEstimateNotice: 'Adjusted proportional budget estimates based on updated financial plan.'
    };

    const diff = {
      type: 'BUDGET_ADJUSTMENT',
      before: {
        totalBudget: oldBudget,
        budgetPerPerson: trip.budgetPerPerson || Math.round(oldBudget / travelersCount),
        breakdown: currentBreakdown
      },
      after: {
        totalBudget: newBudget,
        budgetPerPerson: newBudgetPerPerson,
        breakdown: updatedBreakdown
      }
    };

    const previewId = this.generatePreviewId();
    const diffAmount = newBudget - oldBudget;
    const summary = intent.summary || `Adjusted total budget to ₹${newBudget.toLocaleString('en-IN')} (approx ₹${newBudgetPerPerson.toLocaleString('en-IN')} / person).`;
    const impactSummary = `Total budget ${diffAmount >= 0 ? 'increased' : 'decreased'} by ₹${Math.abs(diffAmount).toLocaleString('en-IN')}. Transportation allocated ₹${transportation.toLocaleString('en-IN')}, Stay ₹${accommodation.toLocaleString('en-IN')}, Food ₹${food.toLocaleString('en-IN')}. Itinerary activities remain unaffected.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'ADJUST_BUDGET',
      affectedDay: null,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: {
        totalBudget: newBudget,
        budgetPerPerson: newBudgetPerPerson,
        budgetBreakdown: updatedBreakdown
      },
      proposedChanges: {
        totalBudget: newBudget,
        budgetPerPerson: newBudgetPerPerson,
        budgetBreakdown: updatedBreakdown
      }
    };
  }

  /**
   * Action 7: CHANGE PREFERENCES
   */
  handleChangePreferences(trip, intent, command) {
    const rawPrefs = intent.newPreferences || {};
    const oldStyle = trip.travelStyle || 'Standard';
    const oldInterests = [...(trip.interests || [])];
    const oldAdditional = trip.additionalPreferences || '';

    const newStyle = rawPrefs.travelStyle || oldStyle;
    let newInterests = rawPrefs.interests || oldInterests;
    if (rawPrefs.addedInterest && !newInterests.includes(rawPrefs.addedInterest)) {
      newInterests = [...newInterests, rawPrefs.addedInterest];
    }
    const newAdditional = rawPrefs.additionalPreferences !== undefined
      ? rawPrefs.additionalPreferences
      : (rawPrefs.preferenceNote ? `${oldAdditional} | ${rawPrefs.preferenceNote}`.trim() : oldAdditional);

    const diff = {
      type: 'PREFERENCES_CHANGE',
      before: {
        travelStyle: oldStyle,
        interests: oldInterests,
        additionalPreferences: oldAdditional
      },
      after: {
        travelStyle: newStyle,
        interests: newInterests,
        additionalPreferences: newAdditional
      }
    };

    const previewId = this.generatePreviewId();
    const summary = intent.summary || `Updated travel style to "${newStyle}" with customized preferences.`;
    const impactSummary = `Travel preferences updated: Style is now ${newStyle}. Interests: [${newInterests.join(', ')}]. Special notes: "${newAdditional || 'None'}". Existing day schedule is preserved.`;

    return {
      previewId,
      userCommand: command,
      actionType: 'CHANGE_PREFERENCES',
      affectedDay: null,
      summary,
      impactSummary,
      diff,
      recalculatedBudget: {
        totalBudget: trip.totalBudget,
        budgetPerPerson: trip.budgetPerPerson,
        budgetBreakdown: trip.budgetBreakdown
      },
      proposedChanges: {
        travelStyle: newStyle,
        interests: newInterests,
        additionalPreferences: newAdditional
      }
    };
  }

  // ==========================================
  // HELPERS & EXTRACTION UTILITIES
  // ==========================================

  recalculateTripBudget(trip, updatedItinerary) {
    let totalActivityCost = 0;
    (updatedItinerary || []).forEach(day => {
      (day.activities || []).forEach(act => {
        totalActivityCost += (parseInt(act.estimatedCost, 10) || 0);
      });
    });

    const currentBreakdown = { ...(trip.budgetBreakdown || {}) };
    currentBreakdown.activities = totalActivityCost;
    currentBreakdown.totalEstimated =
      (parseInt(currentBreakdown.transportation, 10) || 0) +
      (parseInt(currentBreakdown.accommodation, 10) || 0) +
      (parseInt(currentBreakdown.food, 10) || 0) +
      totalActivityCost +
      (parseInt(currentBreakdown.miscellaneous, 10) || 0);

    const travelersCount = Math.max(1, trip.travelersCount || 1);
    currentBreakdown.budgetPerPerson = Math.round(currentBreakdown.totalEstimated / travelersCount);

    return {
      totalBudget: trip.totalBudget,
      budgetPerPerson: Math.round(trip.totalBudget / travelersCount),
      budgetBreakdown: currentBreakdown
    };
  }

  getSuggestedTimeSlot(existingActivities = []) {
    const times = existingActivities.map(a => (a.time || '').toLowerCase());
    if (!times.some(t => t.includes('morning') || t.includes('am'))) return 'Morning (09:30 AM)';
    if (!times.some(t => t.includes('afternoon') || t.includes('12:') || t.includes('01:') || t.includes('02:'))) return 'Afternoon (02:30 PM)';
    if (!times.some(t => t.includes('evening') || t.includes('05:') || t.includes('06:') || t.includes('07:'))) return 'Evening (05:30 PM)';
    return '04:00 PM';
  }

  estimateActivityCost(title = '', travelStyle = 'Standard') {
    const text = title.toLowerCase();
    let base = 500;
    if (text.includes('scuba') || text.includes('diving')) base = 3500;
    else if (text.includes('parasailing') || text.includes('water sports')) base = 1800;
    else if (text.includes('safari') || text.includes('wildlife')) base = 2200;
    else if (text.includes('cruise') || text.includes('boat')) base = 1200;
    else if (text.includes('museum') || text.includes('fort') || text.includes('palace')) base = 300;
    else if (text.includes('trek') || text.includes('walk') || text.includes('beach')) base = 0;
    else if (text.includes('spa') || text.includes('resort')) base = 2500;

    if (travelStyle === 'Luxury') base = Math.round(base * 1.5);
    else if (travelStyle === 'Budget') base = Math.round(base * 0.7);

    return base;
  }

  extractAddData(command, trip, affectedDay) {
    let clean = command
      .replace(/^add\s+/i, '')
      .replace(/^schedule\s+/i, '')
      .replace(/^include\s+/i, '')
      .replace(/^insert\s+/i, '')
      .replace(/^append\s+/i, '')
      .replace(/on\s+day\s*\d+/i, '')
      .replace(/to\s+day\s*\d+/i, '')
      .replace(/in\s+day\s*\d+/i, '')
      .trim();

    // Extract cost if specified: "with cost ₹3500", "cost: 2000", "₹1500"
    let estimatedCost = undefined;
    const costMatch = clean.match(/(?:with\s+)?(?:cost|fee|price)?\s*[:=]?\s*₹?\s*(\d+)/i);
    if (costMatch) {
      estimatedCost = parseInt(costMatch[1], 10);
      clean = clean.replace(costMatch[0], '').trim();
    }

    // Extract time slot: morning, afternoon, evening, night, or explicit HH:MM AM/PM
    let time = 'Afternoon (02:30 PM)';
    const exactTimeMatch = clean.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (exactTimeMatch) {
      time = exactTimeMatch[1].toUpperCase();
      clean = clean.replace(exactTimeMatch[0], '').trim();
    } else if (clean.toLowerCase().includes('morning')) {
      time = 'Morning (10:00 AM)';
      clean = clean.replace(/\bmorning\b/i, '').trim();
    } else if (clean.toLowerCase().includes('evening')) {
      time = 'Evening (05:30 PM)';
      clean = clean.replace(/\bevening\b/i, '').trim();
    } else if (clean.toLowerCase().includes('afternoon')) {
      time = 'Afternoon (02:30 PM)';
      clean = clean.replace(/\bafternoon\b/i, '').trim();
    } else if (clean.toLowerCase().includes('night')) {
      time = 'Night (08:30 PM)';
      clean = clean.replace(/\bnight\b/i, '').trim();
    }

    let location = trip.destination || 'Local Venue';
    const atMatch = clean.match(/\bat\s+([^,]+?)(?=\s+(?:with|on|in|cost|₹|$))/i);
    if (atMatch) {
      location = atMatch[1].trim();
      // Keep "at Location" in the clean title if it adds context, or use it as location
    }

    // Clean up title
    clean = clean.replace(/\bwith\s+cost.*$/i, '').trim();
    let title = clean.trim();
    if (!title) title = 'Local Experience';
    title = title.charAt(0).toUpperCase() + title.slice(1);

    if (estimatedCost === undefined) {
      estimatedCost = this.estimateActivityCost(title, trip.travelStyle);
    }

    return {
      affectedDay: affectedDay || 1,
      newActivity: {
        title,
        time,
        location,
        description: `Enjoy ${title} located around ${location}.`,
        estimatedCost
      }
    };
  }

  extractRemoveData(command, trip, affectedDay) {
    let clean = command
      .replace(/^remove\s+/i, '')
      .replace(/^delete\s+/i, '')
      .replace(/^drop\s+/i, '')
      .replace(/from\s+day\s*\d+/i, '')
      .replace(/on\s+day\s*\d+/i, '')
      .trim();

    // Check if user said "activity 2" or "the second activity"
    const actNumMatch = clean.match(/activity\s*(\d+)/i);
    let targetIndex = undefined;
    if (actNumMatch) {
      targetIndex = Math.max(0, parseInt(actNumMatch[1], 10) - 1);
    }

    return {
      affectedDay: affectedDay || null,
      targetTitle: clean,
      targetIndex
    };
  }

  extractReplaceData(command, trip, affectedDay) {
    // e.g. "Replace Calangute beach with Anjuna flea market on Day 2"
    // e.g. "Swap Amer Fort with Albert Hall Museum"
    let targetTitle = '';
    let newTitle = '';

    const replaceWithMatch = command.match(/replace\s+(.+?)\s+with\s+(.+?)(?:on\s+day|\s*$)/i);
    const swapWithMatch = command.match(/swap\s+(.+?)\s+with\s+(.+?)(?:on\s+day|\s*$)/i);
    const changeToMatch = command.match(/change\s+(.+?)\s+to\s+(.+?)(?:on\s+day|\s*$)/i);

    if (replaceWithMatch) {
      targetTitle = replaceWithMatch[1].trim();
      newTitle = replaceWithMatch[2].trim();
    } else if (swapWithMatch) {
      targetTitle = swapWithMatch[1].trim();
      newTitle = swapWithMatch[2].trim();
    } else if (changeToMatch) {
      targetTitle = changeToMatch[1].trim();
      newTitle = changeToMatch[2].trim();
    } else {
      targetTitle = 'Current Attraction';
      newTitle = 'New Recommended Attraction';
    }

    return {
      affectedDay,
      targetTitle,
      newActivity: {
        title: newTitle.charAt(0).toUpperCase() + newTitle.slice(1),
        location: newTitle,
        description: `Visit ${newTitle} as an enhanced alternative to ${targetTitle}.`,
        estimatedCost: this.estimateActivityCost(newTitle, trip.travelStyle)
      }
    };
  }

  extractTimingData(command, trip, affectedDay) {
    // e.g. "Change Day 2 morning activity to 11:00 AM"
    // e.g. "Shift dinner to 8:30 PM"
    let targetTitle = '';
    let newTiming = '11:00 AM';

    const timeMatch = command.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeMatch) {
      newTiming = timeMatch[1].toUpperCase();
    } else if (command.toLowerCase().includes('morning')) {
      newTiming = 'Morning (09:30 AM)';
    } else if (command.toLowerCase().includes('afternoon')) {
      newTiming = 'Afternoon (02:30 PM)';
    } else if (command.toLowerCase().includes('evening')) {
      newTiming = 'Evening (06:00 PM)';
    }

    // Try finding activity name
    const forMatch = command.match(/for\s+(.+?)\s+to/i) || command.match(/shift\s+(.+?)\s+to/i) || command.match(/change\s+(.+?)\s+time/i);
    if (forMatch) {
      targetTitle = forMatch[1].replace(/day\s*\d+/i, '').trim();
    }

    let newDurationHours = undefined;
    const durMatch = command.match(/(\d+)\s*(?:hour|hr|hrs)/i);
    if (durMatch) {
      newDurationHours = parseInt(durMatch[1], 10);
    }

    return {
      affectedDay: affectedDay || 1,
      targetTitle,
      newTiming,
      newDurationHours
    };
  }

  extractDatesFromCommand(command, trip) {
    const text = command.toLowerCase();
    const oldDep = trip.departureDate ? new Date(trip.departureDate) : new Date();

    // Check for explicit ISO dates YYYY-MM-DD
    const isoMatches = command.match(/\d{4}-\d{2}-\d{2}/g);
    if (isoMatches && isoMatches.length >= 2) {
      return {
        departureDate: isoMatches[0],
        returnDate: isoMatches[1]
      };
    } else if (isoMatches && isoMatches.length === 1) {
      const dep = new Date(isoMatches[0]);
      const ret = new Date(dep.getTime() + (trip.durationDays || 5) * 86400000);
      return {
        departureDate: isoMatches[0],
        returnDate: ret.toISOString().split('T')[0]
      };
    }

    // Check for shift (e.g. "postpone by 7 days", "1 week")
    let shiftDays = 7;
    const daysMatch = text.match(/by\s*(\d+)\s*days?/i) || text.match(/shift\s*(\d+)\s*days?/i);
    if (daysMatch) {
      shiftDays = parseInt(daysMatch[1], 10);
    } else if (text.includes('1 week') || text.includes('one week')) {
      shiftDays = 7;
    } else if (text.includes('2 weeks') || text.includes('two weeks')) {
      shiftDays = 14;
    }

    const newDep = new Date(oldDep.getTime() + shiftDays * 86400000);
    const newRet = new Date(newDep.getTime() + (trip.durationDays || 5) * 86400000);

    return {
      departureDate: newDep.toISOString().split('T')[0],
      returnDate: newRet.toISOString().split('T')[0],
      shiftDays
    };
  }

  extractBudgetData(command, trip) {
    const text = command.toLowerCase();
    const current = trip.totalBudget || 30000;

    // Check for explicit amount e.g. "50000", "₹45,000", "40k"
    const kMatch = text.match(/(\d+)\s*k\b/i);
    if (kMatch) {
      return { newBudget: parseInt(kMatch[1], 10) * 1000 };
    }

    const numberMatch = text.match(/(?:to|of|budget|is)\s*₹?\s*([\d,]+)/i) || text.match(/₹\s*([\d,]+)/i);
    if (numberMatch) {
      const cleanNum = parseInt(numberMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(cleanNum) && cleanNum > 500) {
        return { newBudget: cleanNum };
      }
    }

    // Relative change e.g. "increase budget by 10000"
    const relMatch = text.match(/(?:increase|add)\s*(?:budget)?\s*(?:by)?\s*₹?\s*([\d,]+)/i);
    if (relMatch) {
      const delta = parseInt(relMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(delta)) return { newBudget: current + delta };
    }

    const decMatch = text.match(/(?:reduce|decrease)\s*(?:budget)?\s*(?:by)?\s*₹?\s*([\d,]+)/i);
    if (decMatch) {
      const delta = parseInt(decMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(delta)) return { newBudget: Math.max(1000, current - delta) };
    }

    return { newBudget: null };
  }

  extractPreferenceData(command, trip) {
    const text = command.toLowerCase();
    let travelStyle = trip.travelStyle || 'Standard';

    if (text.includes('luxury')) travelStyle = 'Luxury';
    else if (text.includes('budget')) travelStyle = 'Budget';
    else if (text.includes('standard')) travelStyle = 'Standard';

    const interests = [...(trip.interests || [])];
    const interestOptions = ['Adventure', 'Nature', 'Beaches', 'Food', 'Culture', 'Shopping', 'Relaxation', 'Nightlife', 'Historical'];
    interestOptions.forEach(intName => {
      if (text.includes(intName.toLowerCase()) && !interests.includes(intName)) {
        interests.push(intName);
      }
    });

    let preferenceNote = '';
    if (text.includes('vegetarian')) preferenceNote = 'Pure vegetarian meals required';
    else if (text.includes('vegan')) preferenceNote = 'Vegan dining options preferred';
    else if (text.includes('kid-friendly') || text.includes('kids')) preferenceNote = 'Kid-friendly pace & attractions';
    else if (text.includes('photography')) preferenceNote = 'Focus on scenic spots & photography';

    return {
      travelStyle,
      interests,
      additionalPreferences: preferenceNote ? `${trip.additionalPreferences || ''} (${preferenceNote})`.trim() : trip.additionalPreferences,
      preferenceNote
    };
  }

  generatePreviewId() {
    return 'prev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }
}

module.exports = new TripAssistantAgent();
