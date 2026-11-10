const Project = require('../models/Project');
const Task = require('../models/Task');
const projectAgent = require('../services/ai/projectAgent');
const Notification = require('../models/Notification');

exports.generate = async (req, res, next) => {
  try {
    const { name, description, category, priority, durationDays, availableWorkingHours } = req.body;

    const result = await projectAgent.planProject({
      name: name || 'Modern Project',
      description,
      category,
      priority,
      durationDays,
      availableWorkingHours
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
    const { initialTasks, ...projectPayload } = req.body;

    const project = await Project.create({
      ...projectPayload,
      ownerId: userId
    });

    // If initial tasks were passed from AI roadmap generator, persist them
    if (initialTasks && Array.isArray(initialTasks) && initialTasks.length > 0) {
      for (const t of initialTasks) {
        const taskDue = new Date();
        taskDue.setDate(taskDue.getDate() + (t.targetDayOffset || 3));

        await Task.create({
          ownerId: userId,
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'Medium',
          status: 'To Do',
          originType: 'PROJECT',
          originId: project._id,
          originModel: 'Project',
          originLabel: project.name,
          dueDate: taskDue,
          estimatedDuration: t.estimatedDuration || '2 hours',
          tags: t.tags || ['project']
        });
      }
    }

    await Notification.create({
      ownerId: userId,
      title: 'Project Initialized',
      message: `Project "${project.name}" has been created.`,
      type: 'PROJECT',
      link: `/projects/${project._id}`
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const projects = await Project.find({ ownerId: req.user._id }).sort({ deadline: 1 });

    // Calculate real-time task progress for each project
    const projectsWithProgress = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ ownerId: req.user._id, originId: p._id });
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const calculatedProgress = total > 0 ? Math.round((completed / total) * 100) : p.progress || 0;

      return {
        ...p.toObject(),
        progress: calculatedProgress,
        totalTasks: total,
        completedTasks: completed
      };
    }));

    res.status(200).json({ success: true, count: projectsWithProgress.length, projects: projectsWithProgress });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    const tasks = await Task.find({ ownerId: req.user._id, originId: project._id }).sort({ dueDate: 1 });
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : project.progress;

    res.status(200).json({
      success: true,
      project: {
        ...project.toObject(),
        progress
      },
      tasks
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'Project updated successfully.', project });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized.' });
    }

    // Clean up associated tasks
    await Task.deleteMany({ originId: req.params.id, ownerId: req.user._id });

    res.status(200).json({ success: true, message: 'Project and linked tasks deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.askAssistant = async (req, res, next) => {
  try {
    const { question } = req.body;
    const project = await Project.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const tasks = await Task.find({ ownerId: req.user._id, originId: project._id });
    const aiAnswer = await projectAgent.answerProjectQuery({ project, tasks, question });

    res.status(200).json({ success: true, ...aiAnswer });
  } catch (error) {
    next(error);
  }
};

