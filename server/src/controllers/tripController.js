const Trip = require('../models/Trip');
const travelAgent = require('../services/ai/travelAgent');
const Notification = require('../models/Notification');

exports.generate = async (req, res, next) => {
  try {
    const { destination, startingLocation, durationDays, travelersCount, totalBudget, travelStyle, interests, additionalPreferences } = req.body;

    if (!destination) {
      return res.status(400).json({ success: false, message: 'Destination is required.' });
    }

    const result = await travelAgent.planTrip({
      destination,
      startingLocation: startingLocation || 'Current City',
      durationDays: durationDays || 5,
      travelersCount: travelersCount || 1,
      totalBudget: totalBudget || 30000,
      travelStyle: travelStyle || 'Standard',
      interests: interests || ['Beaches', 'Food'],
      additionalPreferences
    });

    res.status(200).json({
      success: true,
      data: result.data,
      isDemoOutput: result.isDemoOutput,
      provider: result.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tripData = {
      ...req.body,
      ownerId: userId
    };

    // Calculate per person if not set
    if (!tripData.budgetPerPerson && tripData.totalBudget) {
      tripData.budgetPerPerson = Math.round(tripData.totalBudget / (tripData.travelersCount || 1));
    }

    const trip = await Trip.create(tripData);

    await Notification.create({
      ownerId: userId,
      title: 'New Trip Added',
      message: `Your trip to ${trip.destination} (${trip.name}) has been scheduled.`,
      type: 'TRAVEL',
      link: `/trips/${trip._id}`
    });

    res.status(201).json({ success: true, trip });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const trips = await Trip.find({ ownerId: req.user._id }).sort({ departureDate: 1 });
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }
    res.status(200).json({ success: true, trip });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Trip updated successfully.', trip });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Trip deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const printableReport = {
      title: trip.name,
      destination: trip.destination,
      dates: `${new Date(trip.departureDate).toLocaleDateString()} to ${new Date(trip.returnDate).toLocaleDateString()}`,
      travelers: trip.travelersCount,
      estimatedBudget: `₹${trip.totalBudget?.toLocaleString('en-IN')}`,
      budgetBreakdown: trip.budgetBreakdown,
      itinerarySummary: trip.itinerary,
      packingChecklist: trip.packingChecklist,
      generatedAt: new Date().toISOString()
    };

    res.status(200).json({ success: true, report: printableReport });
  } catch (error) {
    next(error);
  }
};
