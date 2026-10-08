/** Product capabilities shown on the Features page (AC-3). */
export type Capability = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export const capabilities: readonly Capability[] = [
  {
    id: 'guided-onboarding',
    name: 'Guided onboarding',
    description:
      'Walk every new teammate through setup in minutes, with checklists that adapt to their role.',
  },
  {
    id: 'live-collaboration',
    name: 'Live collaboration',
    description:
      'Edit together in real time and see who is working on what, without refreshing a page.',
  },
  {
    id: 'automation-rules',
    name: 'Automation rules',
    description:
      'Describe the handover you repeat every week once, then let it run itself from then on.',
  },
  {
    id: 'insight-dashboards',
    name: 'Insight dashboards',
    description:
      'Track delivery, quality and cost side by side on dashboards your whole team can read.',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description:
      'Connect the issue tracker, chat tool and repository you already use in a couple of clicks.',
  },
  {
    id: 'enterprise-security',
    name: 'Enterprise security',
    description:
      'Single sign-on, scoped access and a full audit trail of every change, available on day one.',
  },
];
