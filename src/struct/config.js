class ActionPreset {
  constructor(name, project, config) {
    this.name = name;
    this.project = project;

    this.files = config.files || {};
    this.preRun = config.preRun;
    this.run = config.run;
    this.postRun = config.postRun;
  }
}

class ProjectConfig {
  constructor(actions, context) {
    this.context = context;

    // Create high-level action preset configuration from the action functions
    this.actions = Object.keys(actions).reduce((ret, key) => {
      ret[key] = new ActionPreset(key, this, actions[key]);
      return ret;
    }, {});
  }
}

module.exports = {
  ActionPreset,
  ProjectConfig,
};
