const Trip = require('../models/Trip');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalTrips,
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalDocuments,
      recentConversations,
      upcomingDeadlines
    ] = await Promise.all([
      Trip.countDocuments({ ownerId: userId }),
      Project.countDocuments({ ownerId: userId }),
      Task.countDocuments({ ownerId: userId }),
      Task.countDocuments({ ownerId: userId, status: 'Completed' }),
      Task.countDocuments({ ownerId: userId, status: { $ne: 'Completed' } }),
      Document.countDocuments({ ownerId: userId }),
      Conversation.find({ ownerId: userId }).sort({ lastMessageAt: -1 }).limit(5),
      Task.find({ ownerId: userId, status: { $ne: 'Completed' }, dueDate: { $gte: new Date() } })
        .sort({ dueDate: 1 })
        .limit(5)
    ]);

    // Priority distribution
    const [urgentCount, highCount, mediumCount, lowCount] = await Promise.all([
      Task.countDocuments({ ownerId: userId, priority: 'Urgent' }),
      Task.countDocuments({ ownerId: userId, priority: 'High' }),
      Task.countDocuments({ ownerId: userId, priority: 'Medium' }),
      Task.countDocuments({ ownerId: userId, priority: 'Low' })
    ]);

    // Task status distribution
    const todoCount = await Task.countDocuments({ ownerId: userId, status: 'To Do' });
    const inProgressCount = await Task.countDocuments({ ownerId: userId, status: 'In Progress' });

    // Recent projects with progress
    const activeProjects = await Project.find({ ownerId: userId }).sort({ deadline: 1 }).limit(4);

    res.status(200).json({
      success: true,
      stats: {
        totalTrips,
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        totalDocuments,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      charts: {
        taskStatus: [
          { name: 'To Do', value: todoCount, color: '#3B82F6' },
          { name: 'In Progress', value: inProgressCount, color: '#F59E0B' },
          { name: 'Completed', value: completedTasks, color: '#10B981' }
        ],
        priorityDistribution: [
          { priority: 'Urgent', count: urgentCount, fill: '#EF4444' },
          { priority: 'High', count: highCount, fill: '#F97316' },
          { priority: 'Medium', count: mediumCount, fill: '#3B82F6' },
          { priority: 'Low', count: lowCount, fill: '#10B981' }
        ]
      },
      activeProjects,
      recentConversations,
      upcomingDeadlines
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, activities: notifications });
  } catch (error) {
    next(error);
  }
};
