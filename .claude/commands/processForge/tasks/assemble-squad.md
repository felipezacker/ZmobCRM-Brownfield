# Task: Assemble Squad (Phase 4 - Assembly)

When this command is used, execute the assemble-squad task from the Process Forge squad.

Load and follow the complete task definition from: `squads/process-forge/tasks/assemble-squad.md`

Also load the agent definition from: `squads/process-forge/agents/forge-smith.md`

**Agent:** @forge-smith
**Phase:** 4 - Assembly
**Duration:** 30-60min

## What it does

Generates all AIOS squad artifacts from the blueprint: squad.yaml, agent definitions, tasks (TASK-FORMAT-SPECIFICATION-V1 with 8 mandatory fields), workflows, checklists, and knowledge base. Validates against squad-validator.js with self-healing loop (max 3 attempts).
