# Test intents — examples

Good (names the outcome, cites the requirement):

- `FR-TASK-2: confirming a proposal creates one task per work repo in tech_validation_input/ready and emits task.created`
- `SEC-1: a member of org B requesting org A's task by id gets 404 and no body fields`
- `D21: PATCH with a stale If-Match version → 409 CONFLICT and the row is unchanged`
- `FR-LIM-3: the third Engineer loop pauses the run with needs_approval and keeps the sandbox`

Bad (mechanism, vague, or unobservable):

- `calls the repository with the right arguments`
- `works correctly`
- `handles errors`
- `the service is tested`

Test-plan case (e2e):

```yaml
- id: TP-TASK-03
  title: Run pauses on a limit (loop count) and an approver resumes it
  prd: [FR-LIM-2, FR-LIM-3, D19, Journey 3]
  tier: smoke
  priority: P0
  status: planned
  preconditions: [stub scenario "run-loop-limit"]
  expected: ["needs_approval substate shown with reason", "Resume continues from the paused step"]
```
