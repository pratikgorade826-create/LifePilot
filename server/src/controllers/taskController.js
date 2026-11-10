const Task = require('../models/Task');
const Project = require('../models/Project');

exports.create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const task = await Task.create({
      ...req.body,
      ownerId: userId
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, priority, originType, search, sortBy } = req.query;

    const filter = { ownerId: userId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (originType) filter.originType = originType;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sort = { dueDate: 1, createdAt: -1 };
    if (sortBy === 'priority') {
      sort = { priority: -1, dueDate: 1 };
    } else if (sortBy === 'newest') {
      sort = { createdAt: -1 };
    }

    const tasks = await Task.find(filter).sort(sort);

    // Summary counts for tabs/Kanban
    const total = await Task.countDocuments({ ownerId: userId });
    const todoCount = await Task.countDocuments({ ownerId: userId, status: 'To Do' });
    const inProgressCount = await Task.countDocuments({ ownerId: userId, status: 'In Progress' });
    const completedCount = await Task.countDocuments({ ownerId: userId, status: 'Completed' });
    const overdueCount = await Task.countDocuments({
      ownerId: userId,
      status: { $ne: 'Completed' },
      dueDate: { $lt: new Date() }
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      counts: {
        total,
        todo: todoCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount
      },
      tasks
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Task updated successfully.', task });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['To Do', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updateFields = { status };
    if (status === 'Completed') {
      updateFields.completedAt = new Date();
    } else {
      updateFields.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      updateFields,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or unauthorized.' });
    }

    // If attached to a project, recalculate project progress
    if (task.originType === 'PROJECT' && task.originId) {
      const allProjectTasks = await Task.find({ originId: task.originId, ownerId: req.user._id });
      const completed = allProjectTasks.filter(t => t.status === 'Completed').length;
      const progress = allProjectTasks.length > 0 ? Math.round((completed / allProjectTasks.length) * 100) : 0;
      await Project.findByIdAndUpdate(task.originId, { progress });
    }

    res.status(200).json({ success: true, message: 'Task status updated.', task });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Task removed.' });
  } catch (error) {
    next(error);
  }
};

