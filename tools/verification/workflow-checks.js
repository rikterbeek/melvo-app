import { parseYamlSubset } from './yaml-subset.js';

const UPLOAD_ACTION = 'actions/upload-pages-artifact';

function allSteps(workflow) {
  return Object.values(workflow.jobs ?? {}).flatMap((job) => job?.steps ?? []);
}

function deployJob(workflow) {
  return Object.values(workflow.jobs ?? {}).find((job) => job?.environment);
}

/**
 * Reads the facts a Pages deploy workflow has to get right: one publish
 * directory, the Pages action chain, the default-branch trigger, the minimum
 * permission set, and the environment URL that carries the host-assigned URL
 * back out of the run.
 */
export function inspectDeployWorkflow(yaml) {
  const workflow = parseYamlSubset(yaml);
  const steps = allSteps(workflow);
  const actionRefs = steps.map((step) => step.uses).filter((ref) => typeof ref === 'string');
  const environment = deployJob(workflow)?.environment ?? {};

  return {
    actionRefs,
    usesAction: (name) => actionRefs.some((ref) => ref.startsWith(`${name}@`)),
    publishPaths: steps
      .filter((step) => typeof step.uses === 'string' && step.uses.startsWith(`${UPLOAD_ACTION}@`))
      .map((step) => step.with?.path)
      .filter((path) => path !== undefined),
    pushBranches: workflow.on?.push?.branches ?? [],
    hasWorkflowDispatch: Object.hasOwn(workflow.on ?? {}, 'workflow_dispatch'),
    permissions: workflow.permissions ?? {},
    environmentName: environment.name ?? null,
    environmentUrl: environment.url ?? null,
  };
}
