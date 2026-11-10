const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class ProjectAgent {
  async planProject(params) {
    const {
      prompt,
      name = 'New Project',
      description = '',
      category = 'Development',
      priority = 'High',
      durationDays = 10,
      availableWorkingHours = 20
    } = params;

    const activeProvider = aiProvider.getActiveProvider();

    if (activeProvider !== 'demo') {
      try {
        const userPrompt = prompt || `Project: ${name}. Category: ${category}. Priority: ${priority}. Duration: ${durationDays} days. Available working hours: ${availableWorkingHours} hrs/week. Description: ${description || 'Complete end-to-end delivery of the project.'}`;

        const messages = [
          { role: 'system', content: promptTemplates.PROJECT_PLANNER },
          { role: 'user', content: userPrompt }
        ];

        const res = await aiProvider.generateChat(messages, { temperature: 0.5 });
        const parsed = aiProvider.safeParseJson(res.content);

        if (parsed && parsed.tasks && parsed.tasks.length > 0) {
          return {
            success: true,
            data: parsed,
            isDemoOutput: res.isDemoOutput,
            provider: res.provider
          };
        }
      } catch (err) {
        console.warn('[ProjectAgent] Live generation failed, using intelligent fallback:', err.message);
      }
    }

    return {
      success: true,
      data: this.generateStructuredSampleProject({
        name,
        description,
        category,
        priority,
        durationDays: parseInt(durationDays, 10) || 10,
        availableWorkingHours: parseInt(availableWorkingHours, 10) || 20
      }),
      isDemoOutput: true,
      provider: 'demo-mode'
    };
  }

  generateStructuredSampleProject({ name, description, category, priority, durationDays, availableWorkingHours }) {
    const days = durationDays || 10;

    const milestones = [
      {
        title: 'Phase 1: Architecture & Requirements Definition',
        description: 'Define technical stack, wireframes, and project scope.',
        targetDay: Math.max(1, Math.round(days * 0.2)),
        completed: false
      },
      {
        title: 'Phase 2: Core Feature Implementation',
        description: 'Implement essential business logic, database schemas, and primary views.',
        targetDay: Math.max(2, Math.round(days * 0.6)),
        completed: false
      },
      {
        title: 'Phase 3: Integration, Polish & Quality Assurance',
        description: 'End-to-end testing, bug fixing, responsive design, and documentation.',
        targetDay: Math.max(3, Math.round(days * 0.85)),
        completed: false
      },
      {
        title: 'Phase 4: Final Deployment & Review',
        description: 'Production release, health check, and project handoff.',
        targetDay: days,
        completed: false
      }
    ];

    const tasks = [
      {
        title: 'Clarify project specifications & user personas',
        description: 'Document functional requirements and user expectations.',
        priority: 'High',
        estimatedDuration: '3 hours',
        targetDayOffset: 1,
        tags: ['planning', 'spec']
      },
      {
        title: 'Design database schema & API contracts',
        description: 'Construct entity models, validation rules, and endpoints.',
        priority: 'High',
        estimatedDuration: '4 hours',
        targetDayOffset: 2,
        tags: ['database', 'backend']
      },
      {
        title: 'Build primary user interface components',
        description: 'Create responsive UI screens with modern UX patterns.',
        priority: 'Medium',
        estimatedDuration: '6 hours',
        targetDayOffset: 4,
        tags: ['frontend', 'ui']
      },
      {
        title: 'Integrate frontend with backend services',
        description: 'Hook state management, API requests, and data validation.',
        priority: 'High',
        estimatedDuration: '5 hours',
        targetDayOffset: 6,
        tags: ['integration', 'api']
      },
      {
        title: 'Perform cross-browser & usability testing',
        description: 'Verify workflows on desktop, tablet, and mobile browsers.',
        priority: 'Medium',
        estimatedDuration: '3 hours',
        targetDayOffset: 8,
        tags: ['testing', 'qa']
      },
      {
        title: 'Deploy to cloud hosting & write documentation',
        description: 'Configure environment variables, build scripts, and README.',
        priority: 'High',
        estimatedDuration: '2 hours',
        targetDayOffset: days,
        tags: ['devops', 'release']
      }
    ];

    return {
      name: name || 'Modern Web Application',
      description: description || `Structured ${days}-day milestone plan designed to systematically complete ${name} on time.`,
      category: category || 'Development',
      priority: priority || 'High',
      durationDays: days,
      objectives: [
        `Deliver a fully functional ${name} within ${days} days.`,
        `Maintain high quality code with automated checks and modular architecture.`,
        `Achieve 100% completion of milestone deliverables within ${availableWorkingHours} hrs/week budget.`
      ],
      milestones,
      tasks,
      completionChecklist: [
        { item: 'All planned core features implemented & verified', completed: false },
        { item: 'Zero critical console or server errors remaining', completed: false },
        { item: 'Responsive UI across mobile and desktop devices', completed: false },
        { item: 'Environment variables configured and secured', completed: false },
        { item: 'Project presentation or deployment verified', completed: false }
      ]
    };
  }

  async answerProjectQuery({ project, tasks = [], question }) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress');
    const todo = tasks.filter(t => t.status === 'To Do');

    const context = `Project: "${project.name}" (Status: ${project.status}, Deadline: ${new Date(project.deadline).toLocaleDateString()}).
Tasks total: ${total}, Completed: ${completed}, In Progress: ${inProgress.length}, To Do: ${todo.length}.
Next pending tasks: ${todo.slice(0, 3).map(t => t.title).join(', ') || 'None'}.`;

    const activeProvider = aiProvider.getActiveProvider();
    if (activeProvider !== 'demo') {
      try {
        const messages = [
          { role: 'system', content: `You are LifePilot Project Assistant. Answer accurately using only the real project context provided:\n${context}` },
          { role: 'user', content: question }
        ];
        const res = await aiProvider.generateChat(messages);
        return { answer: res.content, provider: res.provider };
      } catch (err) {
        // Fallback
      }
    }

    return {
      answer: `Here is the current status for **${project.name}**:\n- **Progress:** ${total ? Math.round((completed / total) * 100) : 0}% (${completed}/${total} tasks finished)\n- **Active Work:** ${inProgress.length ? inProgress.map(t => t.title).join(', ') : 'No tasks currently marked In Progress'}\n- **Suggested Next Step:** Work on "${todo[0]?.title || 'Add more tasks to keep momentum going'}"`,
      provider: 'demo-mode'
    };
  }
}

module.exports = new ProjectAgent();

