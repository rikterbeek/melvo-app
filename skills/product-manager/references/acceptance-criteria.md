# Acceptance criteria — patterns

```
AC1 (R1)  Given a Developer on a task in tech_validation_input/ready
          When they click Execute
          Then a run starts, the task shows in_progress, and the run id is visible within 2 s

AC2 (R1)  Given a Member without execute permission
          When they open the task
          Then the Execute button is not rendered and POST /tasks/{id}/execute → 403

AC3 (R2)  Given the organization has no enabled AI model
          When a run is started
          Then it is refused with "No AI model enabled for this organization" and nothing is queued
```

Rules: one behaviour per scenario · the Then is observable from outside (UI text, status, HTTP status, row, event) · include the negative path for every permission and every limit · never mention tables, services or classes.
